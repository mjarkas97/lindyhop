import { json, type RequestHandler } from '@sveltejs/kit'

// The client renders without SSR, so it has no other way to learn who it is.
// The session guard in hooks.server.ts has already run — `user` is never null here.
export const GET: RequestHandler = ({ locals }) => json({ user: locals.user })
