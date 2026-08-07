import { getDb, queryAll, queryOne, type Param } from './db'
import {
  hasTaktzahl,
  isArt,
  isTaktzahl,
  type Entry,
  type EntryInput,
  type SortOrder,
  type Taktzahl,
} from '$lib/shared/entry'
import { isValidVideoName } from './videos'

export type Scope = 'mine' | 'public'

const MAX_NAME = 200
const MAX_TEXT = 5000

/**
 * Nothing from the client is trusted: the browser form validates for the user's
 * benefit, this validates for the database's. Returns the clean input or an
 * error message.
 */
export function parseEntryInput(body: unknown): { input: EntryInput } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Ungültige Anfrage.' }
  const raw = body as Record<string, unknown>

  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) return { error: 'Bitte gib einen Namen ein.' }
  if (name.length > MAX_NAME) return { error: 'Name ist zu lang.' }

  if (!isArt(raw.art)) return { error: 'Ungültige Art.' }

  // A Choreographie or a Solo has none, and whatever the client sent for one is
  // dropped rather than rejected — the same coercion `is_public` gets below.
  let taktzahl: Taktzahl | null = null
  if (hasTaktzahl(raw.art)) {
    if (!isTaktzahl(raw.taktzahl)) return { error: 'Ungültige Taktzahl.' }
    taktzahl = raw.taktzahl
  }

  const videoUri = raw.video_uri
  if (videoUri !== null && (typeof videoUri !== 'string' || !isValidVideoName(videoUri))) {
    return { error: 'Ungültiges Video.' }
  }

  const tags = typeof raw.tags === 'string' ? raw.tags : ''
  const note = typeof raw.note === 'string' ? raw.note : ''
  if (tags.length > MAX_TEXT || note.length > MAX_TEXT) return { error: 'Eingabe ist zu lang.' }

  return {
    input: {
      name,
      art: raw.art,
      taktzahl,
      video_uri: videoUri,
      tags,
      note,
      is_public: raw.is_public === true,
    },
  }
}

// Ported from the old browser-side queries. Not user input — `SortOrder` is
// validated before it gets here, and the value is looked up, never concatenated.
const SORT_CLAUSE: Record<SortOrder, string> = {
  newest:   'e.created_at DESC',
  oldest:   'e.created_at ASC',
  name:     'LOWER(e.name) ASC',
  // NULL sorts first in SQLite, which would head a sort named "Takte" with every
  // entry that has none. They belong at the end instead.
  taktzahl: 'e.taktzahl IS NULL, e.taktzahl ASC, e.created_at DESC',
  // Never practised counts as longest ago, so those come first.
  practice: 'COALESCE(p.last_practiced_at, 0) ASC, e.created_at DESC',
}

const COLUMNS = `
  e.id, e.user_id, e.name, e.art, e.taktzahl, e.video_uri, e.tags, e.note,
  e.is_public, e.created_at, u.username AS owner_username,
  p.practice_count, p.last_practiced_at
`

/**
 * The practice totals are the *viewer's* own, never the owner's — two people
 * looking at the same public entry see their own counts.
 *
 * The subquery's `?` binds before anything in the WHERE clause, so every caller
 * has to pass the viewer's id as the first parameter.
 */
const FROM = `
  FROM entries e
  JOIN users u ON u.id = e.user_id
  LEFT JOIN (
    SELECT entry_id, COUNT(*) AS practice_count, MAX(practiced_at) AS last_practiced_at
      FROM practice_sessions
     WHERE user_id = ?
     GROUP BY entry_id
  ) p ON p.entry_id = e.id
`

interface EntryRow extends Omit<Entry, 'is_public' | 'practice_count'> {
  is_public: number
  /** NULL for an entry the viewer has never practised — that is what the LEFT JOIN yields. */
  practice_count: number | null
}

function toEntry(row: EntryRow): Entry {
  return {
    ...row,
    is_public: row.is_public === 1,
    practice_count: row.practice_count ?? 0,
    last_practiced_at: row.last_practiced_at ?? null,
  }
}

export interface ListOptions {
  search?: string
  art?:    string | null
  sort?:   SortOrder
  scope?:  Scope
}

export function listEntries(userId: number, opts: ListOptions = {}): Entry[] {
  const where: string[] = []
  // First, before any WHERE parameter: this one belongs to the practice subquery.
  const params: Param[] = [userId]

  if (opts.scope === 'public') {
    where.push('e.is_public = 1')
  } else {
    where.push('e.user_id = ?')
    params.push(userId)
  }

  const search = opts.search?.trim().toLowerCase()
  if (search) {
    where.push('(LOWER(e.name) LIKE ? OR LOWER(e.tags) LIKE ? OR LOWER(e.note) LIKE ?)')
    const pat = `%${search}%`
    params.push(pat, pat, pat)
  }

  if (opts.art) {
    where.push('e.art = ?')
    params.push(opts.art)
  }

  const rows = queryAll<EntryRow>(
    `SELECT ${COLUMNS}
     ${FROM}
      WHERE ${where.join(' AND ')}
      ORDER BY ${SORT_CLAUSE[opts.sort ?? 'newest']}`,
    ...params
  )

  return rows.map(toEntry)
}

/**
 * Readable by the owner, or by anyone once it is public. Callers treat `null` as
 * 404 for both the missing and the forbidden case — a 403 would confirm the id
 * exists and belongs to someone.
 */
export function getEntry(id: number, userId: number): Entry | null {
  const row = queryOne<EntryRow>(
    `SELECT ${COLUMNS}
     ${FROM}
      WHERE e.id = ? AND (e.user_id = ? OR e.is_public = 1)`,
    userId,
    id,
    userId
  )

  return row ? toEntry(row) : null
}

/** Owner-only lookup, for the write paths. */
export function getOwnedEntry(id: number, userId: number): Entry | null {
  const row = queryOne<EntryRow>(
    `SELECT ${COLUMNS}
     ${FROM}
      WHERE e.id = ? AND e.user_id = ?`,
    userId,
    id,
    userId
  )

  return row ? toEntry(row) : null
}

export function createEntry(userId: number, input: EntryInput): number {
  const result = getDb()
    .prepare(
      `INSERT INTO entries (user_id, name, art, taktzahl, video_uri, tags, note, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.name,
      input.art,
      input.taktzahl,
      input.video_uri,
      input.tags,
      input.note,
      input.is_public ? 1 : 0,
      Date.now()
    )

  return Number(result.lastInsertRowid)
}

export function updateEntry(id: number, userId: number, input: EntryInput): boolean {
  const result = getDb()
    .prepare(
      `UPDATE entries
          SET name = ?, art = ?, taktzahl = ?, video_uri = ?, tags = ?, note = ?, is_public = ?
        WHERE id = ? AND user_id = ?`
    )
    .run(
      input.name,
      input.art,
      input.taktzahl,
      input.video_uri,
      input.tags,
      input.note,
      input.is_public ? 1 : 0,
      id,
      userId
    )

  return result.changes > 0
}

export function deleteEntry(id: number, userId: number): boolean {
  return getDb().prepare('DELETE FROM entries WHERE id = ? AND user_id = ?').run(id, userId).changes > 0
}

/** Tag suggestions come from the user's own entries only. */
export function listAllTags(userId: number): string[] {
  const rows = queryAll<{ tags: string }>(
    `SELECT tags FROM entries WHERE user_id = ? AND tags <> ''`,
    userId
  )

  const set = new Set<string>()
  for (const row of rows) {
    for (const raw of row.tags.split(',')) {
      const tag = raw.trim()
      if (tag) set.add(tag)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}
