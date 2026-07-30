// Replaces the old lib/db/queries.ts. Same exported signatures — the callers do
// not know or care that the rows now come over HTTP instead of from a worker.

import { request, postJson } from './client'
import type { Art, Entry, EntryInput, SortOrder } from '$lib/shared/entry'

export type { Entry, EntryInput, SortOrder }

export interface ListEntriesOptions {
  search?: string
  art?:    Art | null
  sort?:   SortOrder
  /** `public` lists every user's shared entries; the default lists your own. */
  scope?:  'mine' | 'public'
}

export async function listEntries(opts: ListEntriesOptions = {}): Promise<Entry[]> {
  const params = new URLSearchParams()
  if (opts.search?.trim()) params.set('search', opts.search.trim())
  if (opts.art) params.set('art', opts.art)
  if (opts.sort) params.set('sort', opts.sort)
  if (opts.scope) params.set('scope', opts.scope)

  const query = params.toString()
  const { entries } = await request<{ entries: Entry[] }>(`/api/entries${query ? `?${query}` : ''}`)
  return entries
}

export async function getEntry(id: number): Promise<Entry | null> {
  const response = await fetch(`/api/entries/${id}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Eintrag konnte nicht geladen werden.')

  const { entry } = (await response.json()) as { entry: Entry }
  return entry
}

export async function createEntry(input: EntryInput): Promise<number> {
  const { id } = await postJson<{ id: number }>('/api/entries', input)
  return id
}

export async function updateEntry(id: number, input: EntryInput): Promise<void> {
  await request(`/api/entries/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function deleteEntry(id: number): Promise<void> {
  await request(`/api/entries/${id}`, { method: 'DELETE' })
}

export async function listAllTags(): Promise<string[]> {
  const { tags } = await request<{ tags: string[] }>('/api/tags')
  return tags
}
