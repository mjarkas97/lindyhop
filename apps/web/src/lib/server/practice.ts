import { getDb, queryAll } from './db'
import { MAX_PRACTICE_NOTE, type PracticeInput, type PracticeSession } from '$lib/shared/practice'

/**
 * Same contract as `parseEntryInput`: the browser validates for the user, this
 * validates for the database. Returns the clean input or a German message.
 */
export function parsePracticeInput(body: unknown): { input: PracticeInput } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Ungültige Anfrage.' }
  const raw = body as Record<string, unknown>

  const entryId = raw.entry_id
  if (!Number.isInteger(entryId) || (entryId as number) <= 0) return { error: 'Ungültiger Eintrag.' }

  // Omitted means now — the common case is one tap on "Geübt".
  const practicedAt = raw.practiced_at === undefined ? Date.now() : raw.practiced_at
  if (!Number.isInteger(practicedAt) || (practicedAt as number) <= 0) {
    return { error: 'Ungültiges Datum.' }
  }
  if ((practicedAt as number) > Date.now()) {
    return { error: 'Das Datum liegt in der Zukunft.' }
  }

  const note = typeof raw.note === 'string' ? raw.note.trim() : ''
  if (note.length > MAX_PRACTICE_NOTE) return { error: 'Notiz ist zu lang.' }

  return { input: { entry_id: entryId as number, practiced_at: practicedAt as number, note } }
}

/**
 * The route has already proven the entry is readable by this user; this only
 * writes the row.
 */
export function logPractice(userId: number, input: PracticeInput): number {
  const result = getDb()
    .prepare('INSERT INTO practice_sessions (user_id, entry_id, practiced_at, note) VALUES (?, ?, ?, ?)')
    .run(userId, input.entry_id, input.practiced_at, input.note)

  return Number(result.lastInsertRowid)
}

interface SessionRow extends Omit<PracticeSession, 'readable'> {
  readable: number
}

/**
 * The viewer's own history, newest first. `readable` says whether the entry can
 * still be opened: a shared entry practised last week may have been made private
 * since, and the history should stop linking to it rather than lead into a 404.
 */
export function listPractice(userId: number, entryId?: number): PracticeSession[] {
  const rows = queryAll<SessionRow>(
    `SELECT p.id, p.entry_id, p.practiced_at, p.note,
            e.name AS entry_name, e.art,
            (e.user_id = ? OR e.is_public = 1) AS readable
       FROM practice_sessions p
       JOIN entries e ON e.id = p.entry_id
      WHERE p.user_id = ?${entryId === undefined ? '' : ' AND p.entry_id = ?'}
      ORDER BY p.practiced_at DESC, p.id DESC`,
    ...(entryId === undefined ? [userId, userId] : [userId, userId, entryId])
  )

  return rows.map((row) => ({ ...row, readable: row.readable === 1 }))
}

export function deletePracticeSession(id: number, userId: number): boolean {
  return (
    getDb().prepare('DELETE FROM practice_sessions WHERE id = ? AND user_id = ?').run(id, userId)
      .changes > 0
  )
}
