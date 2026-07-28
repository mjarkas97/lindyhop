import { DB_NAME, type DbRequest, type DbResponse, type DbResult, type Row, type SqlParam } from './protocol'

export interface Db {
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>
  run(sql: string, params?: SqlParam[]): Promise<number>
  /** Full database as bytes — the NextCloud upload (MJ-26) reads it from here. */
  export(): Promise<Uint8Array>
}

interface Pending {
  resolve: (value: never) => void
  reject:  (error: Error) => void
}

let worker: Worker | null = null
let dbPromise: Promise<Db> | null = null
let nextId = 0
const pending = new Map<number, Pending>()

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<DbResponse>) => {
    const message = event.data
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (message.ok) entry.resolve(message.result as never)
    else entry.reject(new Error(message.error))
  }
  return worker
}

function send<K extends keyof DbResult>(
  kind: K,
  sql?: string,
  params?: SqlParam[]
): Promise<DbResult[K]> {
  const id = ++nextId
  const request: DbRequest = { id, kind, sql, params }
  return new Promise<DbResult[K]>((resolve, reject) => {
    pending.set(id, { resolve: resolve as Pending['resolve'], reject })
    getWorker().postMessage(request)
  })
}

const db: Db = {
  all: <T>(sql: string, params: SqlParam[] = []) => send('all', sql, params) as Promise<T[]>,
  run: (sql: string, params: SqlParam[] = []) => send('run', sql, params),
  export: () => send('export'),
}

/**
 * Opens the database, running the schema and first-run seed. The promise is
 * cached rather than the resolved value, so concurrent callers during startup
 * share one open instead of racing.
 */
export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = send('open').then(() => db)
  }
  return dbPromise
}

/** OPFS path of the database file — the sync flow (MJ-26) replaces it wholesale. */
export function getDbPath(): string {
  return `/${DB_NAME}`
}

export async function closeDb(): Promise<void> {
  if (!dbPromise) return
  try {
    await send('close')
  } catch {
    // Closing a database that never finished opening is not worth reporting.
  }
  worker?.terminate()
  worker = null
  dbPromise = null
  for (const entry of pending.values()) entry.reject(new Error('Database closed'))
  pending.clear()
}

export type { Row, SqlParam }
