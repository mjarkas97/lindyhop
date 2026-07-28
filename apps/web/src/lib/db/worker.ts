/// <reference lib="webworker" />
import sqlite3InitModule, { type Database, type Sqlite3Static } from '@sqlite.org/sqlite-wasm'
import { DB_NAME, type DbRequest, type DbResponse } from './protocol'
import { SCHEMA_SQL } from './schema'
import { seedIfEmpty } from './seed'

let sqlite3: Sqlite3Static
let db: Database

async function open(): Promise<void> {
  sqlite3 = await sqlite3InitModule()
  if (!sqlite3.oo1.OpfsDb) {
    // Never fall back to an in-memory database: it looks like it works and
    // then silently loses everything the user typed on the next reload.
    throw new Error(
      'OPFS VFS unavailable. The page must be cross-origin isolated ' +
        '(Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp) ' +
        'and the browser must support OPFS.'
    )
  }
  db = new sqlite3.oo1.OpfsDb(`/${DB_NAME}`)
  db.exec(SCHEMA_SQL)
  seedIfEmpty(db)
}

const ready = open()

function post(message: DbResponse): void {
  self.postMessage(message)
}

self.onmessage = async (event: MessageEvent<DbRequest>) => {
  const { id, kind, sql = '', params = [] } = event.data
  try {
    await ready
    switch (kind) {
      case 'open':
        post({ id, ok: true, result: null })
        break
      case 'all':
        post({ id, ok: true, result: db.selectObjects(sql, params) })
        break
      case 'run':
        db.exec(params.length ? { sql, bind: params } : { sql })
        post({ id, ok: true, result: Number(sqlite3.capi.sqlite3_last_insert_rowid(db)) })
        break
      case 'export':
        post({ id, ok: true, result: sqlite3.capi.sqlite3_js_db_export(db) })
        break
      case 'close':
        db.close()
        post({ id, ok: true, result: null })
        break
    }
  } catch (err) {
    post({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
