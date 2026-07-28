// Message contract between the app and the SQLite worker. The OPFS VFS is only
// installed when sqlite3.js is loaded from a Worker thread, so every query has
// to cross this boundary.

export const DB_NAME = 'lindyhop_v2.db'

export type SqlParam = string | number | null

export type Row = Record<string, unknown>

export interface DbResult {
  open:   null
  all:    Row[]
  run:    number // lastInsertRowId
  export: Uint8Array
  close:  null
}

export type DbKind = keyof DbResult

export interface DbRequest {
  id:      number
  kind:    DbKind
  sql?:    string
  params?: SqlParam[]
}

export type DbResponse =
  | { id: number; ok: true; result: DbResult[DbKind] }
  | { id: number; ok: false; error: string }
