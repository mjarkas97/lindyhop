import { json, type RequestHandler } from '@sveltejs/kit'
import { createEntry, listEntries, parseEntryInput, type Scope } from '$lib/server/entries'
import { isSortOrder } from '$lib/shared/entry'

export const GET: RequestHandler = ({ url, locals }) => {
  const user = locals.user!
  const sort = url.searchParams.get('sort')
  const scope: Scope = url.searchParams.get('scope') === 'public' ? 'public' : 'mine'

  const entries = listEntries(user.id, {
    search: url.searchParams.get('search') ?? undefined,
    art: url.searchParams.get('art'),
    sort: isSortOrder(sort) ? sort : undefined,
    scope,
  })

  return json({ entries })
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const parsed = parseEntryInput(await request.json())
  if ('error' in parsed) return json({ error: parsed.error }, { status: 400 })

  return json({ id: createEntry(locals.user!.id, parsed.input) }, { status: 201 })
}
