import * as SQLite from 'expo-sqlite'
import { SCHEMA_SQL } from './schema'
import { seedIfEmpty } from './seed'

const DB_NAME = 'lindyhop_v2.db'

let _db: SQLite.SQLiteDatabase | null = null

export function getDb(): SQLite.SQLiteDatabase {
  if (_db) return _db
  _db = SQLite.openDatabaseSync(DB_NAME)
  _db.execSync(SCHEMA_SQL)
  seedIfEmpty(_db)
  return _db
}

export function getDbPath(): string {
  return getDb().databasePath
}

export function closeDb(): void {
  if (!_db) return
  try { _db.closeSync() } catch { }
  _db = null
}
