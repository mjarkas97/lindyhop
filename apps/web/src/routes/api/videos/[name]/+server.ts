import { json, type RequestHandler } from '@sveltejs/kit'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { VIDEO_TYPES, canReadVideo, isValidVideoName, videoPath } from '$lib/server/videos'

const MIME_BY_EXT = Object.fromEntries(Object.entries(VIDEO_TYPES).map(([mime, ext]) => [ext, mime]))

const NOT_FOUND = { error: 'Video nicht gefunden.' }

/** `bytes=start-end`, either end open. Anything else is treated as no range at all. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null

  const [, rawStart, rawEnd] = match

  if (rawStart === '') {
    if (rawEnd === '') return null
    // `bytes=-500` — the last 500 bytes.
    const length = Number(rawEnd)
    return length > 0 ? { start: Math.max(0, size - length), end: size - 1 } : null
  }

  const start = Number(rawStart)
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)

  return start <= end && start < size ? { start, end } : null
}

export const GET: RequestHandler = async ({ params, request, locals }) => {
  const name = params.name!
  if (!isValidVideoName(name) || !canReadVideo(name, locals.user!.id)) {
    return json(NOT_FOUND, { status: 404 })
  }

  let size: number
  try {
    size = (await stat(videoPath(name))).size
  } catch {
    return json(NOT_FOUND, { status: 404 })
  }

  const type = MIME_BY_EXT[name.split('.').pop()!] ?? 'application/octet-stream'
  const range = parseRange(request.headers.get('range'), size)

  // Without a 206 the browser will not let anyone scrub the timeline — it has to
  // be able to ask for the middle of the file.
  if (range) {
    const stream = createReadStream(videoPath(name), { start: range.start, end: range.end })
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        'content-type': type,
        'content-length': String(range.end - range.start + 1),
        'content-range': `bytes ${range.start}-${range.end}/${size}`,
        'accept-ranges': 'bytes',
        'cache-control': 'private, max-age=31536000',
      },
    })
  }

  return new Response(Readable.toWeb(createReadStream(videoPath(name))) as ReadableStream, {
    headers: {
      'content-type': type,
      'content-length': String(size),
      'accept-ranges': 'bytes',
      'cache-control': 'private, max-age=31536000',
    },
  })
}
