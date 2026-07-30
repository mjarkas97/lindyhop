import { json, type RequestHandler } from '@sveltejs/kit'
import { changePassword, invalidateOtherSessions, validateCredentials } from '$lib/server/auth'

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user!
  const { currentPassword, newPassword } = await request.json()

  if (typeof currentPassword !== 'string') return json({ error: 'Ungültige Anfrage.' }, { status: 400 })

  const invalid = validateCredentials(user.username, newPassword)
  if (invalid) return json({ error: invalid }, { status: 400 })

  if (!(await changePassword(user.id, currentPassword, newPassword))) {
    return json({ error: 'Aktuelles Passwort ist falsch.' }, { status: 403 })
  }

  // A password change is how you lock out a device you no longer trust, so every
  // other session has to go. This one survives — logging the user out of the tab
  // they just used would be pointless.
  invalidateOtherSessions(user.id, locals.sessionToken!)

  return json({ ok: true })
}
