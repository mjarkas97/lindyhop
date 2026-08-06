import { json, type RequestHandler } from '@sveltejs/kit'
import { deletePracticeSession } from '$lib/server/practice'

const NOT_FOUND = { error: 'Eintrag nicht gefunden.' }

export const DELETE: RequestHandler = ({ params, locals }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return json(NOT_FOUND, { status: 404 })

  // The delete is scoped to the owner, so someone else's session and one that
  // was never there are the same answer.
  return deletePracticeSession(id, locals.user!.id)
    ? json({ ok: true })
    : json(NOT_FOUND, { status: 404 })
}
