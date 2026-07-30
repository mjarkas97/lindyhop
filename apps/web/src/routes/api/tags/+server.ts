import { json, type RequestHandler } from '@sveltejs/kit'
import { listAllTags } from '$lib/server/entries'

export const GET: RequestHandler = ({ locals }) => json({ tags: listAllTags(locals.user!.id) })
