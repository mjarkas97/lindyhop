import { json, type RequestHandler } from '@sveltejs/kit'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web'
import { VIDEO_TYPES, videoPath } from '$lib/server/videos'

/**
 * Raw body upload rather than multipart: `request.formData()` would buffer the
 * whole video in memory before anything touched disk. This streams it through.
 */
export const POST: RequestHandler = async ({ request }) => {
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  const ext = VIDEO_TYPES[type]
  if (!ext) return json({ error: 'Dieses Videoformat wird nicht unterstützt.' }, { status: 415 })

  if (!request.body) return json({ error: 'Leerer Upload.' }, { status: 400 })

  // The client never names the file, so the name is always a uuid we generated
  // and can be trusted by everything downstream.
  const name = `${randomUUID()}.${ext}`
  const path = videoPath(name)

  try {
    await pipeline(Readable.fromWeb(request.body as NodeWebReadableStream), createWriteStream(path))
  } catch (err) {
    // A half-written file would otherwise sit there until the orphan sweep.
    await unlink(path).catch(() => {})
    console.error('[videos] upload failed:', err)
    return json({ error: 'Video konnte nicht gespeichert werden.' }, { status: 500 })
  }

  return json({ uri: name }, { status: 201 })
}
