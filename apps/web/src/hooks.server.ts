import { redirect, type Handle, type ServerInit } from '@sveltejs/kit'
import { SESSION_COOKIE, clearSessionCookie, validateSession } from '$lib/server/auth'
import { validateEnv } from '$lib/server/env'
import { startVideoSweeper } from '$lib/server/videos'

// Routes reachable without a session. Everything else — pages and API alike —
// requires one.
const PUBLIC_ROUTES = new Set(['/login', '/register'])
const PUBLIC_API = new Set(['/api/auth/login', '/api/auth/register', '/api/auth/logout'])

// Runs once when the server starts, and — unlike module scope — not during the
// build's analyse pass, so neither the env check nor touching the data volume
// happens at image-build time.
export const init: ServerInit = () => {
  validateEnv()
  startVideoSweeper()
}

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(SESSION_COOKIE) ?? null
  const user = token ? validateSession(token) : null

  // An expired or forged token leaves a cookie the browser would keep sending.
  if (token && !user) clearSessionCookie(event.cookies)

  event.locals.user = user
  event.locals.sessionToken = user ? token : null

  const path = event.url.pathname

  if (path.startsWith('/api/')) {
    if (!user && !PUBLIC_API.has(path)) {
      return new Response(JSON.stringify({ error: 'Nicht angemeldet.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
  } else if (!user && !PUBLIC_ROUTES.has(path)) {
    // The app renders on the client, so this is the only place a logged-out
    // visitor can be turned away before any of the shell reaches them.
    throw redirect(303, '/login')
  } else if (user && PUBLIC_ROUTES.has(path)) {
    throw redirect(303, '/')
  }

  return resolve(event)
}
