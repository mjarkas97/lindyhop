import { get, writable } from 'svelte/store'
import { listEntries, type Entry, type ListEntriesOptions } from '$lib/db/queries'

export const options = writable<ListEntriesOptions>({})
export const entries = writable<Entry[]>([])
export const loading = writable(false)
export const error = writable<string | null>(null)

// Typing in the search field fires overlapping queries; only the newest one is
// allowed to write to the store.
let seq = 0

async function load(opts: ListEntriesOptions): Promise<void> {
  const mine = ++seq
  loading.set(true)
  try {
    const rows = await listEntries(opts)
    if (mine !== seq) return
    entries.set(rows)
    error.set(null)
  } catch (err) {
    if (mine !== seq) return
    error.set(err instanceof Error ? err.message : String(err))
  } finally {
    if (mine === seq) loading.set(false)
  }
}

options.subscribe((opts) => {
  void load(opts)
})

/** Call after a create/update/delete — the RN version got this from useFocusEffect. */
export function reload(): void {
  void load(get(options))
}
