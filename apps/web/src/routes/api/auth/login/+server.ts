import { json, type RequestHandler } from '@sveltejs/kit'
import { authenticate, createSession, setSessionCookie } from '$lib/server/auth'

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { username, password } = await request.json()

  if (typeof username !== 'string' || typeof password !== 'string') {
    return json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const user = await authenticate(username, password)
  // Deliberately one message for both a wrong name and a wrong password —
  // saying which was wrong tells an attacker which accounts exist.
  if (!user) return json({ error: 'Benutzername oder Passwort ist falsch.' }, { status: 401 })

  const { token, expiresAt } = createSession(user.id)
  setSessionCookie(cookies, token, expiresAt)

  return json({ user })
}
