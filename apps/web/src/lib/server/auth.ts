import { hash, verify } from '@node-rs/argon2'
import { createHash, randomBytes } from 'node:crypto'
import type { Cookies } from '@sveltejs/kit'
import { getDb, queryOne, transaction } from './db'
import { SECURE_COOKIES } from './env'

export const SESSION_COOKIE = 'session'

export const SESSION_MS = 30 * 24 * 60 * 60 * 1000
/** Past this point a still-valid session gets its expiry pushed back out. */
const RENEW_MS = 15 * 24 * 60 * 60 * 1000

export interface User {
  id:       number
  username: string
  is_admin: boolean
}

interface UserRow {
  id:            number
  username:      string
  password_hash: string
  is_admin:      number
}

export function hashPassword(password: string): Promise<string> {
  return hash(password)
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password)
}

/**
 * The cookie carries the raw token; the database stores only its SHA-256. A
 * dump of the sessions table therefore hands over no usable session. SHA-256 is
 * enough here precisely because the token is 32 random bytes — there is nothing
 * to brute-force, so the slow hashing that passwords need buys nothing.
 */
function sessionId(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(userId: number): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + SESSION_MS

  getDb()
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sessionId(token), userId, expiresAt)

  return { token, expiresAt }
}

export function validateSession(token: string): User | null {
  const db = getDb()
  const id = sessionId(token)

  const row = queryOne<{ expires_at: number; id: number; username: string; is_admin: number }>(
    `SELECT s.expires_at, u.id, u.username, u.is_admin
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
    id
  )

  if (!row) return null

  if (row.expires_at <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
    return null
  }

  if (row.expires_at - Date.now() < RENEW_MS) {
    db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(Date.now() + SESSION_MS, id)
  }

  return { id: row.id, username: row.username, is_admin: row.is_admin === 1 }
}

export function invalidateSession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId(token))
}

/** Everywhere but here — used after a password change, which should log out other devices. */
export function invalidateOtherSessions(userId: number, keepToken: string): void {
  getDb()
    .prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?')
    .run(userId, sessionId(keepToken))
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: number): void {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: SECURE_COOKIES,
    expires: new Date(expiresAt),
  })
}

export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: SECURE_COOKIES })
}

// --- users ---------------------------------------------------------------

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/
const MIN_PASSWORD = 8

export function validateCredentials(username: unknown, password: unknown): string | null {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return 'Benutzername: 3-32 Zeichen, nur Buchstaben, Ziffern, - und _.'
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return `Passwort: mindestens ${MIN_PASSWORD} Zeichen.`
  }
  return null
}

/** Whether the instance has been bootstrapped at all. */
export function hasAnyUser(): boolean {
  return (queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM users')!).n > 0
}

export async function createUser(username: string, password: string): Promise<User | null> {
  const db = getDb()
  const passwordHash = await hashPassword(password)

  // Count and insert in one transaction, so two simultaneous first registrations
  // cannot both come out as admin.
  return transaction((): User | null => {
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) return null

    const first = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n === 0
    const result = db
      .prepare('INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?)')
      .run(username, passwordHash, first ? 1 : 0, Date.now())

    return { id: Number(result.lastInsertRowid), username, is_admin: first }
  })
}

export async function authenticate(username: string, password: string): Promise<User | null> {
  const row = queryOne<UserRow>(
    'SELECT id, username, password_hash, is_admin FROM users WHERE username = ?',
    username
  )

  // Hash something anyway when the user does not exist, so a missing account and
  // a wrong password take the same time and cannot be told apart.
  if (!row) {
    await hashPassword(password)
    return null
  }

  if (!(await verifyPassword(row.password_hash, password))) return null

  return { id: row.id, username: row.username, is_admin: row.is_admin === 1 }
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  nextPassword: string
): Promise<boolean> {
  const row = queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', userId)

  if (!row || !(await verifyPassword(row.password_hash, currentPassword))) return false

  getDb()
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(await hashPassword(nextPassword), userId)
  return true
}
