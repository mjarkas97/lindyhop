import { json, type RequestHandler } from '@sveltejs/kit'
import { clearSessionCookie, invalidateSession } from '$lib/server/auth'

export const POST: RequestHandler = async ({ locals, cookies }) => {
  if (locals.sessionToken) invalidateSession(locals.sessionToken)
  clearSessionCookie(cookies)
  return json({ ok: true })
}
