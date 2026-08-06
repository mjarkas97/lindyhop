import type { DatabaseSync } from 'node:sqlite'

// Migrations are a plain numbered list run against SQLite's own `user_version`.
// Append, never edit: an edited step has already run on the deployed database
// and will not run again.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    is_admin      INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE sessions (
    id         TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    art        TEXT    NOT NULL,
    taktzahl   INTEGER NOT NULL,
    video_uri  TEXT,
    tags       TEXT    NOT NULL DEFAULT '',
    note       TEXT    NOT NULL DEFAULT '',
    is_public  INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX idx_entries_user    ON entries(user_id, created_at DESC);
  CREATE INDEX idx_entries_public  ON entries(is_public, created_at DESC);
  CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
  `,

  // Instance settings the admin panel can change without a redeploy.
  `
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,

  // One row per practice. `user_id` is whoever practiced, not the entry's owner:
  // a public entry can be practiced by anyone who can read it, and each of them
  // sees only their own history and counts.
  `
  CREATE TABLE practice_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    entry_id     INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    practiced_at INTEGER NOT NULL,
    note         TEXT    NOT NULL DEFAULT ''
  );

  CREATE INDEX idx_practice_user  ON practice_sessions(user_id, practiced_at DESC);
  CREATE INDEX idx_practice_entry ON practice_sessions(entry_id, user_id);
  `,
]

/**
 * Brings the database up to the current schema. Each step runs in its own
 * transaction together with the `user_version` bump, so a failing migration
 * leaves the version untouched and is retried on the next boot rather than
 * leaving the schema half-applied.
 */
export function migrate(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }

  for (let version = row.user_version; version < MIGRATIONS.length; version++) {
    db.exec('BEGIN')
    try {
      db.exec(MIGRATIONS[version])
      // Not bindable — PRAGMA takes a literal. `version` is a loop counter, not input.
      db.exec(`PRAGMA user_version = ${version + 1}`)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }
}
