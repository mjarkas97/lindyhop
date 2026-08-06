// Client mirror of /api/practice, same shape as lib/api/entries.ts.

import { request, postJson } from './client'
import type { PracticeSession } from '$lib/shared/practice'

export type { PracticeSession }

export async function listPractice(entryId?: number): Promise<PracticeSession[]> {
  const query = entryId === undefined ? '' : `?entry=${entryId}`
  const { sessions } = await request<{ sessions: PracticeSession[] }>(`/api/practice${query}`)
  return sessions
}

export async function logPractice(
  entryId: number,
  practicedAt: number,
  note: string
): Promise<number> {
  const { id } = await postJson<{ id: number }>('/api/practice', {
    entry_id: entryId,
    practiced_at: practicedAt,
    note,
  })
  return id
}

export async function deletePractice(id: number): Promise<void> {
  await request(`/api/practice/${id}`, { method: 'DELETE' })
}
