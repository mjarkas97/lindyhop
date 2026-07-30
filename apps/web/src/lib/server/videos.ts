import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { queryAll, queryOne } from './db'
import { VIDEO_DIR } from './env'

/**
 * Filenames this server generates and nothing else: a uuid, a dot, an extension.
 * Checked before any name reaches `join`, so `..` and absolute paths cannot get
 * through in the first place.
 */
const FILENAME_RE = /^[a-f0-9-]{36}\.[a-z0-9]{1,5}$/

/** Extension per accepted upload type — the client never picks the name. */
export const VIDEO_TYPES: Record<string, string> = {
  'video/mp4':       'mp4',
  'video/quicktime': 'mov',
  'video/webm':      'webm',
  'video/x-matroska': 'mkv',
  'video/3gpp':      '3gp',
}

export function isValidVideoName(name: string): boolean {
  return FILENAME_RE.test(name)
}

export function videoPath(name: string): string {
  return join(VIDEO_DIR, name)
}

/**
 * True when the viewer may fetch this file: they own the entry using it, or the
 * entry is public. A file no entry references is readable by nobody — a
 * just-uploaded video is only visible to the uploader once it is saved.
 */
export function canReadVideo(name: string, userId: number): boolean {
  const row = queryOne(
    'SELECT 1 FROM entries WHERE video_uri = ? AND (user_id = ? OR is_public = 1) LIMIT 1',
    name,
    userId
  )

  return row !== undefined
}

/** Files newer than this are assumed to belong to an upload still in progress. */
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * Deletes uploaded files no entry points at. A video is written before the entry
 * that references it is saved, so anything abandoned in between — the user
 * closed the tab, the save failed — would otherwise sit on the volume forever.
 */
export function sweepOrphanVideos(): void {
  try {
    const referenced = new Set(
      queryAll<{ video_uri: string }>(
        'SELECT video_uri FROM entries WHERE video_uri IS NOT NULL'
      ).map((row) => row.video_uri)
    )

    const cutoff = Date.now() - ORPHAN_GRACE_MS

    for (const name of readdirSync(VIDEO_DIR)) {
      if (referenced.has(name)) continue
      const path = join(VIDEO_DIR, name)
      if (statSync(path).mtimeMs > cutoff) continue
      unlinkSync(path)
    }
  } catch (err) {
    // Housekeeping must never take the server down with it.
    console.error('[videos] orphan sweep failed:', err)
  }
}

export function deleteVideoFile(name: string): void {
  try {
    unlinkSync(videoPath(name))
  } catch {
    // Already gone. Nothing to report.
  }
}

/**
 * Sweeps at boot and then periodically. Boot alone is not enough: a server that
 * stays up for weeks would never collect anything.
 */
export function startVideoSweeper(): void {
  sweepOrphanVideos()
  setInterval(sweepOrphanVideos, SWEEP_INTERVAL_MS).unref()
}
