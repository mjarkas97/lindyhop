import { getDb } from './client'
import type { Art, Taktzahl } from './schema'

export type SortOrder = 'newest' | 'oldest' | 'name' | 'taktzahl'

const SORT_CLAUSE: Record<SortOrder, string> = {
  newest:   'created_at DESC',
  oldest:   'created_at ASC',
  name:     'LOWER(name) ASC',
  taktzahl: 'taktzahl ASC, created_at DESC',
}

export interface ListEntriesOptions {
  search?: string
  art?:    Art | null
  sort?:   SortOrder
}

export interface Entry {
  id:         number
  name:       string
  art:        Art
  taktzahl:   Taktzahl
  video_uri:  string | null
  tags:       string
  note:       string
  created_at: number
}

export interface EntryInput {
  name:      string
  art:       Art
  taktzahl:  Taktzahl
  video_uri: string | null
  tags:      string
  note:      string
}

export function listEntries(opts: ListEntriesOptions = {}): Entry[] {
  const where: string[] = []
  const params: (string | number)[] = []

  const search = opts.search?.trim().toLowerCase()
  if (search) {
    where.push('(LOWER(name) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(note) LIKE ?)')
    const pat = `%${search}%`
    params.push(pat, pat, pat)
  }

  if (opts.art) {
    where.push('art = ?')
    params.push(opts.art)
  }

  const orderBy = SORT_CLAUSE[opts.sort ?? 'newest']
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  return getDb().getAllSync<Entry>(
    `SELECT id, name, art, taktzahl, video_uri, tags, note, created_at
       FROM entries
       ${whereSql}
       ORDER BY ${orderBy}`,
    ...params
  )
}

export function getEntry(id: number): Entry | null {
  const row = getDb().getFirstSync<Entry>(
    `SELECT id, name, art, taktzahl, video_uri, tags, note, created_at
       FROM entries
      WHERE id = ?`,
    id
  )
  return row ?? null
}

export function createEntry(input: EntryInput): number {
  const res = getDb().runSync(
    `INSERT INTO entries (name, art, taktzahl, video_uri, tags, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.name,
    input.art,
    input.taktzahl,
    input.video_uri,
    input.tags,
    input.note,
    Date.now()
  )
  return Number(res.lastInsertRowId)
}

export function updateEntry(id: number, input: EntryInput): void {
  getDb().runSync(
    `UPDATE entries
        SET name = ?, art = ?, taktzahl = ?, video_uri = ?, tags = ?, note = ?
      WHERE id = ?`,
    input.name,
    input.art,
    input.taktzahl,
    input.video_uri,
    input.tags,
    input.note,
    id
  )
}

export function deleteEntry(id: number): void {
  getDb().runSync('DELETE FROM entries WHERE id = ?', id)
}

export function listAllTags(): string[] {
  const rows = getDb().getAllSync<{ tags: string }>(
    `SELECT tags FROM entries WHERE tags <> ''`
  )
  const set = new Set<string>()
  for (const r of rows) {
    for (const raw of r.tags.split(',')) {
      const t = raw.trim()
      if (t) set.add(t)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}
