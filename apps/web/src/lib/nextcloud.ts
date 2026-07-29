// Config half of apps/mobile/lib/nextcloud.ts. The web has no expo-secure-store
// equivalent, so the credentials sit in localStorage in the clear — hence the
// app-password hint on the settings form. Synchronous, unlike the RN original:
// the Promise wrappers there only existed because SecureStore is async.
//
// The WebDAV client (MJ-26) lands in this file.

const KEYS = {
  serverUrl: 'nextcloud_server_url',
  username:  'nextcloud_username',
  password:  'nextcloud_password',
} as const

export interface NextCloudConfig {
  serverUrl: string
  username:  string
  password:  string
}

export function saveConfig(config: NextCloudConfig): void {
  // webdavUrl() concatenates without a separator, so a trailing slash would
  // produce a double one.
  localStorage.setItem(KEYS.serverUrl, config.serverUrl.replace(/\/+$/, ''))
  localStorage.setItem(KEYS.username, config.username)
  localStorage.setItem(KEYS.password, config.password)
}

export function loadConfig(): NextCloudConfig | null {
  const serverUrl = localStorage.getItem(KEYS.serverUrl)
  const username = localStorage.getItem(KEYS.username)
  const password = localStorage.getItem(KEYS.password)
  if (!serverUrl || !username || !password) return null
  return { serverUrl, username, password }
}

export function clearConfig(): void {
  for (const key of Object.values(KEYS)) localStorage.removeItem(key)
}
