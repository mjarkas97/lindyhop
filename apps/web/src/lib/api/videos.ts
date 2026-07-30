// Replaces the old lib/videoStorage.ts. Videos are files on the server now, so
// there is no object URL to build and revoke — `videoUrl` is a plain path, and
// the browser streams it with Range requests.

import { request } from './client'

/**
 * Sent as a raw body, not multipart: the server pipes it straight to disk, and
 * a multipart wrapper would only force it through memory on both ends.
 */
export async function persistVideo(file: File): Promise<string> {
  const { uri } = await request<{ uri: string }>('/api/videos', {
    method: 'POST',
    headers: { 'content-type': file.type || 'video/mp4' },
    body: file,
  })
  return uri
}

export function videoUrl(uri: string | null): string | null {
  return uri ? `/api/videos/${uri}` : null
}
