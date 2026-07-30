import { json, type RequestHandler } from '@sveltejs/kit'
import { hasAnyUser } from '$lib/server/auth'
import { isRegistrationOpen } from '$lib/server/settings'

// Read by /login and /register, both of which a logged-out visitor sees, so this
// has to be public. It leaks only whether signups are accepted, which the signup
// form would reveal anyway.
export const GET: RequestHandler = () => json({ open: isRegistrationOpen() || !hasAnyUser() })
