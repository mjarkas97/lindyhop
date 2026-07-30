import { json, type RequestHandler } from '@sveltejs/kit'
import {
  createSession,
  createUser,
  hasAnyUser,
  setSessionCookie,
  validateCredentials,
} from '$lib/server/auth'
import { isRegistrationOpen } from '$lib/server/settings'

export const POST: RequestHandler = async ({ request, cookies }) => {
  // The very first account is always allowed through, whatever the setting says.
  // Otherwise an instance that starts with registration closed could never be
  // bootstrapped, and there would be no admin to open it again.
  if (!isRegistrationOpen() && hasAnyUser()) {
    return json({ error: 'Die Registrierung ist derzeit geschlossen.' }, { status: 403 })
  }

  const { username, password } = await request.json()

  const invalid = validateCredentials(username, password)
  if (invalid) return json({ error: invalid }, { status: 400 })

  const user = await createUser(username, password)
  if (!user) return json({ error: 'Dieser Benutzername ist bereits vergeben.' }, { status: 409 })

  const { token, expiresAt } = createSession(user.id)
  setSessionCookie(cookies, token, expiresAt)

  return json({ user })
}
