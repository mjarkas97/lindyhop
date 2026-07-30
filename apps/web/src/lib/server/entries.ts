import { getDb, queryAll, queryOne, type Param } from './db'
import { isArt, isTaktzahl, type Entry, type EntryInput, type SortOrder } from '$lib/shared/entry'
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
  if (!isTaktzahl(raw.taktzahl)) return { error: 'Ungültige Taktzahl.' }

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
      taktzahl: raw.taktzahl,
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
  taktzahl: 'e.taktzahl ASC, e.created_at DESC',
}

const COLUMNS = `
  e.id, e.user_id, e.name, e.art, e.taktzahl, e.video_uri, e.tags, e.note,
  e.is_public, e.created_at, u.username AS owner_username
`

interface EntryRow extends Omit<Entry, 'is_public'> {
  is_public: number
}

function toEntry(row: EntryRow): Entry {
  return { ...row, is_public: row.is_public === 1 }
}

export interface ListOptions {
  search?: string
  art?:    string | null
  sort?:   SortOrder
  scope?:  Scope
}

export function listEntries(userId: number, opts: ListOptions = {}): Entry[] {
  const where: string[] = []
  const params: Param[] = []

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
       FROM entries e
       JOIN users u ON u.id = e.user_id
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
       FROM entries e
       JOIN users u ON u.id = e.user_id
      WHERE e.id = ? AND (e.user_id = ? OR e.is_public = 1)`,
    id,
    userId
  )

  return row ? toEntry(row) : null
}

/** Owner-only lookup, for the write paths. */
export function getOwnedEntry(id: number, userId: number): Entry | null {
  const row = queryOne<EntryRow>(
    `SELECT ${COLUMNS}
       FROM entries e
       JOIN users u ON u.id = e.user_id
      WHERE e.id = ? AND e.user_id = ?`,
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
