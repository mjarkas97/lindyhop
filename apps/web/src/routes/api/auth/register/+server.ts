import { json, type RequestHandler } from '@sveltejs/kit'
import { createSession, createUser, setSessionCookie, validateCredentials } from '$lib/server/auth'

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { username, password } = await request.json()

  const invalid = validateCredentials(username, password)
  if (invalid) return json({ error: invalid }, { status: 400 })

  const user = await createUser(username, password)
  if (!user) return json({ error: 'Dieser Benutzername ist bereits vergeben.' }, { status: 409 })

  const { token, expiresAt } = createSession(user.id)
  setSessionCookie(cookies, token, expiresAt)

  return json({ user })
}
