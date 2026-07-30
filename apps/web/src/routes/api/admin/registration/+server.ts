import { json, type RequestHandler } from '@sveltejs/kit'
import { isRegistrationOpen, setRegistrationOpen } from '$lib/server/settings'

export const POST: RequestHandler = async ({ request }) => {
  const { open } = await request.json()
  if (typeof open !== 'boolean') return json({ error: 'Ungültige Anfrage.' }, { status: 400 })

  setRegistrationOpen(open)
  return json({ open: isRegistrationOpen() })
}
