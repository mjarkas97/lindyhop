import * as FileSystem from 'expo-file-system/legacy'
import * as SecureStore from 'expo-secure-store'
import { getDb, getDbPath, closeDb } from '../db/client'

declare function btoa(input: string): string

const REMOTE_DIR = 'LindyHop'
const DB_NAME = 'lindyhop_v2.db'
const SECURE_KEYS = {
  serverUrl: 'nextcloud_server_url',
  username:  'nextcloud_username',
  password:  'nextcloud_password',
} as const

export interface NextCloudConfig {
  serverUrl: string
  username:  string
  password:  string
}

export async function saveConfig(config: NextCloudConfig): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEYS.serverUrl, config.serverUrl.replace(/\/+$/, '')),
    SecureStore.setItemAsync(SECURE_KEYS.username, config.username),
    SecureStore.setItemAsync(SECURE_KEYS.password, config.password),
  ])
}

export async function loadConfig(): Promise<NextCloudConfig | null> {
  const [serverUrl, username, password] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS.serverUrl),
    SecureStore.getItemAsync(SECURE_KEYS.username),
    SecureStore.getItemAsync(SECURE_KEYS.password),
  ])
  if (!serverUrl || !username || !password) return null
  return { serverUrl, username, password }
}

export async function clearConfig(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.serverUrl),
    SecureStore.deleteItemAsync(SECURE_KEYS.username),
    SecureStore.deleteItemAsync(SECURE_KEYS.password),
  ])
}

function webdavUrl(config: NextCloudConfig): string {
  const encUser = encodeURIComponent(config.username)
  return `${config.serverUrl}/remote.php/dav/files/${encUser}/${REMOTE_DIR}/${DB_NAME}`
}

function dirUrl(config: NextCloudConfig): string {
  const encUser = encodeURIComponent(config.username)
  return `${config.serverUrl}/remote.php/dav/files/${encUser}/${REMOTE_DIR}/`
}

function authHeader(config: NextCloudConfig): string {
  return `Basic ${btoa(`${config.username}:${config.password}`)}`
}

async function ensureRemoteDir(config: NextCloudConfig): Promise<void> {
  try {
    await fetch(dirUrl(config), {
      method: 'MKCOL',
      headers: { Authorization: authHeader(config) },
    })
  } catch { }
}

export async function testConnection(
  config: NextCloudConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const url = `${config.serverUrl}/remote.php/dav/files/${encodeURIComponent(config.username)}/`
    const response = await fetch(url, {
      method: 'PROPFIND',
      headers: { Authorization: authHeader(config) },
    })
    if (response.ok) return { ok: true }
    if (response.status === 401) return { ok: false, error: 'Ungültige Anmeldedaten (401)' }
    return { ok: false, error: `Server antwortet mit ${response.status}` }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Verbindung fehlgeschlagen' }
  }
}

export type SyncResult =
  | { ok: true; action: 'uploaded' | 'downloaded' | 'skipped' }
  | { ok: false; error: string }

export async function uploadToNextCloud(config: NextCloudConfig): Promise<SyncResult> {
  try {
    await ensureRemoteDir(config)
    const bytes = getDb().serializeSync()
    const url = webdavUrl(config)
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: authHeader(config),
        'Content-Type': 'application/octet-stream',
      },
      body: bytes,
    })
    if (response.ok) return { ok: true, action: 'uploaded' }
    const text = await response.text().catch(() => '')
    return { ok: false, error: `Upload fehlgeschlagen (${response.status})${text ? ': ' + text : ''}` }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Upload fehlgeschlagen' }
  }
}

export async function downloadFromNextCloud(config: NextCloudConfig): Promise<SyncResult> {
  try {
    const url = webdavUrl(config)
    const dbPath = getDbPath()
    closeDb()
    const result = await FileSystem.downloadAsync(url, dbPath, {
      headers: { Authorization: authHeader(config) },
    })
    getDb()
    if (result.status === 404) {
      return { ok: false, error: 'Kein Backup in der Cloud gefunden' }
    }
    if (result.status !== 200) {
      return { ok: false, error: `Download fehlgeschlagen (${result.status})` }
    }
    return { ok: true, action: 'downloaded' }
  } catch (e: any) {
    getDb()
    return { ok: false, error: e?.message || 'Download fehlgeschlagen' }
  }
}
