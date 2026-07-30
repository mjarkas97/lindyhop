import { getDb, queryOne } from './db'

// Instance settings, kept in the database rather than the environment so the
// admin panel can change them without a redeploy.

const REGISTRATION_OPEN = 'registration_open'

function get(key: string): string | null {
  return queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? null
}

function set(key: string, value: string): void {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
    .run(key, value, value)
}

/** Open unless explicitly closed, so upgrading an existing instance changes nothing. */
export function isRegistrationOpen(): boolean {
  return get(REGISTRATION_OPEN) !== 'false'
}

export function setRegistrationOpen(open: boolean): void {
  set(REGISTRATION_OPEN, open ? 'true' : 'false')
}
