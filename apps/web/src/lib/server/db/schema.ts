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

  // Drops NOT NULL from entries.taktzahl, which SQLite can only do by rebuilding
  // the table. A Choreographie or a Solo has no single bar count, so the numbers
  // those rows carry are whatever the form defaulted to — cleared here.
  //
  // Safe only because migrate() runs with foreign keys off: DROP TABLE would
  // otherwise cascade into practice_sessions and delete every logged practice.
  // The indexes go with the old table and have to be recreated.
  `
  CREATE TABLE entries_new (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    art        TEXT    NOT NULL,
    taktzahl   INTEGER,
    video_uri  TEXT,
    tags       TEXT    NOT NULL DEFAULT '',
    note       TEXT    NOT NULL DEFAULT '',
    is_public  INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  INSERT INTO entries_new (id, user_id, name, art, taktzahl, video_uri, tags, note, is_public, created_at)
  SELECT id, user_id, name, art,
         CASE WHEN art IN ('choreography', 'solo') THEN NULL ELSE taktzahl END,
         video_uri, tags, note, is_public, created_at
    FROM entries;

  DROP TABLE entries;
  ALTER TABLE entries_new RENAME TO entries;

  CREATE INDEX idx_entries_user   ON entries(user_id, created_at DESC);
  CREATE INDEX idx_entries_public ON entries(is_public, created_at DESC);
  `,
]

/**
 * Brings the database up to the current schema. Each step runs in its own
 * transaction together with the `user_version` bump, so a failing migration
 * leaves the version untouched and is retried on the next boot rather than
 * leaving the schema half-applied.
 *
 * Foreign keys are off for the duration. SQLite cannot alter a column, so
 * changing one means rebuilding the table — and `DROP TABLE` fires every
 * `ON DELETE CASCADE` pointing at it, which would take unrelated rows with it.
 * The pragma is a no-op inside a transaction, so it has to be set out here
 * rather than at the top of a migration. `foreign_key_check` afterwards is what
 * catches a rebuild that dropped a reference on the floor.
 */
export function migrate(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  // The common case is a boot with nothing to do; leave the pragma alone.
  if (row.user_version >= MIGRATIONS.length) return

  db.exec('PRAGMA foreign_keys = OFF')
  try {
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

    const orphans = db.prepare('PRAGMA foreign_key_check').all()
    if (orphans.length > 0) {
      throw new Error(`migration left ${orphans.length} orphaned row(s) behind`)
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
  }
}
