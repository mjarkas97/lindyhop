import { json, type RequestHandler } from '@sveltejs/kit'
import { getEntry } from '$lib/server/entries'
import { listPractice, logPractice, parsePracticeInput } from '$lib/server/practice'

export const GET: RequestHandler = ({ url, locals }) => {
  const entry = Number(url.searchParams.get('entry'))
  const entryId = Number.isInteger(entry) && entry > 0 ? entry : undefined

  return json({ sessions: listPractice(locals.user!.id, entryId) })
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user!

  const parsed = parsePracticeInput(await request.json())
  if ('error' in parsed) return json({ error: parsed.error }, { status: 400 })

  // Anything you can read, you can practise — your own entries and other
  // people's public ones. Someone else's private entry answers 404 like a
  // missing one; a 403 would confirm the id exists.
  if (!getEntry(parsed.input.entry_id, user.id)) {
    return json({ error: 'Eintrag nicht gefunden.' }, { status: 404 })
  }

  return json({ id: logPractice(user.id, parsed.input) }, { status: 201 })
}
