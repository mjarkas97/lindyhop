// The build prints "node:sqlite ... could not be resolved – treating it as an
// external dependency". That is correct and harmless: it is a Node builtin, and
// the bundler's builtin list simply predates it.
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DATABASE_PATH, VIDEO_DIR } from '../env'
import { migrate } from './schema'

let instance: DatabaseSync | null = null

/**
 * The one database handle for the process. `node:sqlite` is synchronous and
 * built into Node — no native addon to compile, and nothing to pool.
 */
export function getDb(): DatabaseSync {
  if (instance) return instance

  mkdirSync(dirname(DATABASE_PATH), { recursive: true })
  mkdirSync(VIDEO_DIR, { recursive: true })

  const db = new DatabaseSync(DATABASE_PATH)
  // WAL lets reads run alongside a write, which matters as soon as two people
  // use the app at once. NORMAL is the standard companion: durable across a
  // process crash, only at risk on OS/power loss.
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA synchronous = NORMAL')
  // Off by default in SQLite, and the entries/sessions cascades depend on it.
  db.exec('PRAGMA foreign_keys = ON')

  migrate(db)

  instance = db
  return db
}

export type Param = string | number | null

/**
 * `node:sqlite` types every column as `SQLOutputValue`, so a row never lines up
 * with a hand-written interface. These two are the only place that cast lives —
 * the callers say what shape they expect and get it.
 */
export function queryAll<T>(sql: string, ...params: Param[]): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[]
}

export function queryOne<T>(sql: string, ...params: Param[]): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined
}

/**
 * Runs `fn` inside a transaction. `node:sqlite` has no transaction helper of its
 * own, so this is the one place BEGIN/COMMIT is written out.
 */
export function transaction<T>(fn: () => T): T {
  const db = getDb()
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
