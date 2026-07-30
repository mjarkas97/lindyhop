import { json, type RequestHandler } from '@sveltejs/kit'
import { instanceStats, listUsers } from '$lib/server/admin'
import { isRegistrationOpen } from '$lib/server/settings'

// The admin guard lives in hooks.server.ts and has already run.
export const GET: RequestHandler = () => {
  const users = listUsers()
  return json({ users, stats: instanceStats(users), registrationOpen: isRegistrationOpen() })
}
