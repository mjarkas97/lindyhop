import { json, type RequestHandler } from '@sveltejs/kit'
import { queryOne } from '$lib/server/db'

/**
 * For the container healthcheck. Touches the database rather than just returning
 * 200, so an instance that booted but cannot open /data reports unhealthy instead
 * of quietly accepting requests it will fail.
 */
export const GET: RequestHandler = () => {
  try {
    queryOne('SELECT 1')
    return json({ ok: true })
  } catch (err) {
    console.error('[health] database unreachable:', err)
    return json({ ok: false }, { status: 503 })
  }
}
