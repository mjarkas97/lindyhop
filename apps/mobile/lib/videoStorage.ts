import * as FileSystem from 'expo-file-system/legacy'

const VIDEO_DIR = FileSystem.documentDirectory + 'videos/'

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(VIDEO_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true })
  }
}

function extFromUri(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return match?.[1]?.toLowerCase() ?? 'mp4'
}

export async function persistVideo(sourceUri: string): Promise<string> {
  await ensureDir()
  const dest = `${VIDEO_DIR}${Date.now()}.${extFromUri(sourceUri)}`
  await FileSystem.copyAsync({ from: sourceUri, to: dest })
  return dest
}

export async function deleteVideo(uri: string | null): Promise<void> {
  if (!uri) return
  if (!uri.startsWith(VIDEO_DIR)) return
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true })
  } catch {
  }
}
