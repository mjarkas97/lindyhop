// Videos live in an OPFS `videos/` directory, next to the SQLite file. Stored
// in the DB as the relative path `videos/<timestamp>.<ext>`, never as a blob or
// object URL — those do not survive a reload.

const VIDEO_DIR = 'videos'
const PREFIX = `${VIDEO_DIR}/`

async function dir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(VIDEO_DIR, { create: true })
}

function extFromName(name: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return match?.[1]?.toLowerCase() ?? 'mp4'
}

export async function persistVideo(file: File): Promise<string> {
  const name = `${Date.now()}.${extFromName(file.name)}`
  const handle = await (await dir()).getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  await file.stream().pipeTo(writable)
  return `${PREFIX}${name}`
}

/** Refuses anything outside `videos/` — same guard as the RN version. */
export async function deleteVideo(uri: string | null): Promise<void> {
  if (!uri || !uri.startsWith(PREFIX)) return
  try {
    await (await dir()).removeEntry(uri.slice(PREFIX.length))
  } catch {
    // Already gone. Nothing to report.
  }
}

/** Object URL for playback. The caller owns it and must revoke it. */
export async function videoUrl(uri: string | null): Promise<string | null> {
  if (!uri || !uri.startsWith(PREFIX)) return null
  try {
    const handle = await (await dir()).getFileHandle(uri.slice(PREFIX.length))
    return URL.createObjectURL(await handle.getFile())
  } catch {
    return null
  }
}
