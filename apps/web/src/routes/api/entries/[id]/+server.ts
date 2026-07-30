import { json, type RequestHandler } from '@sveltejs/kit'
import {
  deleteEntry,
  getEntry,
  getOwnedEntry,
  parseEntryInput,
  updateEntry,
} from '$lib/server/entries'
import { deleteVideoFile } from '$lib/server/videos'

const NOT_FOUND = { error: 'Eintrag nicht gefunden.' }

function parseId(value: string | undefined): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const GET: RequestHandler = ({ params, locals }) => {
  const id = parseId(params.id)
  if (id === null) return json(NOT_FOUND, { status: 404 })

  const entry = getEntry(id, locals.user!.id)
  return entry ? json({ entry }) : json(NOT_FOUND, { status: 404 })
}

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const id = parseId(params.id)
  if (id === null) return json(NOT_FOUND, { status: 404 })

  const user = locals.user!
  const existing = getOwnedEntry(id, user.id)
  // Someone else's entry answers exactly like a missing one, public or not.
  if (!existing) return json(NOT_FOUND, { status: 404 })

  const parsed = parseEntryInput(await request.json())
  if ('error' in parsed) return json({ error: parsed.error }, { status: 400 })

  updateEntry(id, user.id, parsed.input)

  // The replaced video is unreachable the moment the row stops pointing at it.
  if (existing.video_uri && existing.video_uri !== parsed.input.video_uri) {
    deleteVideoFile(existing.video_uri)
  }

  return json({ ok: true })
}

export const DELETE: RequestHandler = ({ params, locals }) => {
  const id = parseId(params.id)
  if (id === null) return json(NOT_FOUND, { status: 404 })

  const user = locals.user!
  const existing = getOwnedEntry(id, user.id)
  if (!existing) return json(NOT_FOUND, { status: 404 })

  deleteEntry(id, user.id)
  if (existing.video_uri) deleteVideoFile(existing.video_uri)

  return json({ ok: true })
}
