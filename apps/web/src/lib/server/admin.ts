import { statSync } from 'node:fs'
import { getDb, queryAll, queryOne } from './db'
import { SESSION_MS } from './auth'
import { videoPath } from './videos'

export interface AdminUser {
  id:             number
  username:       string
  is_admin:       boolean
  created_at:     number
  entries:        number
  public_entries: number
  videos:         number
  /** Bytes of video on the volume. Summed from the files, not stored anywhere. */
  storage:        number
  /** Approximate, and null for anyone whose session has lapsed. See below. */
  last_seen:      number | null
}

interface UserRow {
  id:              number
  username:        string
  is_admin:        number
  created_at:      number
  entries:         number
  public_entries:  number
  videos:          number
  session_expires: number | null
}

export function listUsers(): AdminUser[] {
  const rows = queryAll<UserRow>(
    `SELECT u.id, u.username, u.is_admin, u.created_at,
            COUNT(e.id)                      AS entries,
            COALESCE(SUM(e.is_public), 0)    AS public_entries,
            COUNT(e.video_uri)               AS videos,
            (SELECT MAX(s.expires_at) FROM sessions s WHERE s.user_id = u.id) AS session_expires
       FROM users u
       LEFT JOIN entries e ON e.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at ASC`
  )

  const storage = storageByUser()

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    is_admin: row.is_admin === 1,
    created_at: row.created_at,
    entries: row.entries,
    public_entries: row.public_entries,
    videos: row.videos,
    storage: storage.get(row.id) ?? 0,
    // Sessions slide forward on every request, so the expiry minus the session
    // length is roughly when the user was last active. Approximate on purpose:
    // it cannot see anyone whose session has already lapsed, hence the null.
    last_seen: row.session_expires === null ? null : row.session_expires - SESSION_MS,
  }))
}

/**
 * Video bytes per user. Sizes are not in the database, so this stats each
 * referenced file — fine at this scale. If it ever is not, the fix is a `size`
 * column written at upload time, not a cleverer query.
 */
function storageByUser(): Map<number, number> {
  const rows = queryAll<{ user_id: number; video_uri: string }>(
    'SELECT user_id, video_uri FROM entries WHERE video_uri IS NOT NULL'
  )

  const totals = new Map<number, number>()
  for (const row of rows) {
    let size = 0
    try {
      size = statSync(videoPath(row.video_uri)).size
    } catch {
      // Row points at a file that is gone. Counts as zero rather than failing
      // the whole page.
    }
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + size)
  }
  return totals
}

export interface InstanceStats {
  users:          number
  entries:        number
  public_entries: number
  videos:         number
  storage:        number
}

export function instanceStats(users: AdminUser[]): InstanceStats {
  return {
    users: users.length,
    entries: users.reduce((n, u) => n + u.entries, 0),
    public_entries: users.reduce((n, u) => n + u.public_entries, 0),
    videos: users.reduce((n, u) => n + u.videos, 0),
    storage: users.reduce((n, u) => n + u.storage, 0),
  }
}

export function countAdmins(): number {
  return queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM users WHERE is_admin = 1')!.n
}

export function getUser(id: number): { id: number; username: string; is_admin: boolean } | null {
  const row = queryOne<{ id: number; username: string; is_admin: number }>(
    'SELECT id, username, is_admin FROM users WHERE id = ?',
    id
  )
  return row ? { id: row.id, username: row.username, is_admin: row.is_admin === 1 } : null
}

export function setAdmin(id: number, isAdmin: boolean): void {
  getDb().prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(isAdmin ? 1 : 0, id)
}

export function forceLogout(id: number): void {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
}

/**
 * Entries and sessions go with the user through ON DELETE CASCADE. Their video
 * files are not cascaded, but need no explicit cleanup either: with the rows
 * gone nothing references them, so the orphan sweep collects them on its next
 * pass.
 */
export function deleteUser(id: number): void {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
}
