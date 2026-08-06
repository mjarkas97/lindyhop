import { beforeEach, describe, expect, it } from 'vitest'
import { getDb } from './db'
import { createUser, type User } from './auth'
import { createEntry, deleteEntry, getEntry, listEntries, updateEntry } from './entries'
import { deletePracticeSession, listPractice, logPractice, parsePracticeInput } from './practice'
import type { EntryInput } from '$lib/shared/entry'

// The rules that matter here are the same kind as in authz.test.ts: who may log
// a practice, and whose practice each viewer sees.

const PASSWORD = 'lindyhop123'
const DAY = 24 * 60 * 60 * 1000

function entry(overrides: Partial<EntryInput> = {}): EntryInput {
  return {
    name: 'Swing Out',
    art: 'figur',
    taktzahl: 8,
    video_uri: null,
    tags: 'basics',
    note: '',
    is_public: false,
    ...overrides,
  }
}

let alice: User
let bob: User

beforeEach(async () => {
  getDb().exec('DELETE FROM users')
  alice = (await createUser('alice', PASSWORD))!
  bob = (await createUser('bob', PASSWORD))!
})

describe('logging a practice', () => {
  it('records one on your own entry', () => {
    const id = createEntry(alice.id, entry())
    logPractice(alice.id, { entry_id: id, practiced_at: Date.now(), note: '' })
    expect(listPractice(alice.id)).toHaveLength(1)
  })

  it('lets another user log one on a public entry', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    // This is the check the route gates on before writing anything.
    expect(getEntry(id, bob.id)).not.toBeNull()

    logPractice(bob.id, { entry_id: id, practiced_at: Date.now(), note: 'im Kurs' })
    expect(listPractice(bob.id)[0]).toMatchObject({ entry_name: 'Swing Out', note: 'im Kurs' })
  })

  it('leaves another user’s private entry unreachable', () => {
    const id = createEntry(alice.id, entry())
    // Null is what the route turns into a 404, so bob never gets to log at all.
    expect(getEntry(id, bob.id)).toBeNull()
  })
})

describe('parsePracticeInput', () => {
  it('defaults the timestamp to now', () => {
    const before = Date.now()
    const result = parsePracticeInput({ entry_id: 1 })
    expect(result).toHaveProperty('input')
    expect((result as { input: { practiced_at: number } }).input.practiced_at).toBeGreaterThanOrEqual(before)
  })

  it('accepts a backdated session', () => {
    expect(parsePracticeInput({ entry_id: 1, practiced_at: Date.now() - 2 * DAY })).toHaveProperty('input')
  })

  it('rejects a timestamp in the future', () => {
    expect(parsePracticeInput({ entry_id: 1, practiced_at: Date.now() + DAY })).toHaveProperty('error')
  })

  it('rejects an unusable entry id', () => {
    expect(parsePracticeInput({ entry_id: 0 })).toHaveProperty('error')
    expect(parsePracticeInput({ entry_id: 'nope' })).toHaveProperty('error')
    expect(parsePracticeInput(null)).toHaveProperty('error')
  })

  it('trims the note and rejects one that is too long', () => {
    expect(parsePracticeInput({ entry_id: 1, note: '  langsam  ' })).toMatchObject({
      input: { note: 'langsam' },
    })
    expect(parsePracticeInput({ entry_id: 1, note: 'x'.repeat(501) })).toHaveProperty('error')
  })
})

describe('practice counts on an entry', () => {
  it('shows each viewer only their own', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    logPractice(alice.id, { entry_id: id, practiced_at: Date.now(), note: '' })
    logPractice(alice.id, { entry_id: id, practiced_at: Date.now() - DAY, note: '' })

    // The same public entry, seen by its owner and by someone else.
    expect(getEntry(id, alice.id)?.practice_count).toBe(2)
    expect(getEntry(id, bob.id)?.practice_count).toBe(0)
    expect(getEntry(id, bob.id)?.last_practiced_at).toBeNull()
  })

  it('keeps the count per viewer when listing too', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    logPractice(bob.id, { entry_id: id, practiced_at: Date.now(), note: '' })

    expect(listEntries(bob.id, { scope: 'public' })[0].practice_count).toBe(1)
    expect(listEntries(alice.id, { scope: 'public' })[0].practice_count).toBe(0)
  })

  it('still filters and scopes correctly with the practice join in place', () => {
    createEntry(alice.id, entry({ name: 'Charleston', tags: 'vintage' }))
    createEntry(alice.id, entry({ name: 'Swing Out' }))
    createEntry(bob.id, entry({ name: 'bob only' }))

    expect(listEntries(alice.id, { scope: 'mine' })).toHaveLength(2)
    expect(listEntries(alice.id, { search: 'vintage' })).toHaveLength(1)
    expect(listEntries(alice.id, { art: 'solo' })).toHaveLength(0)
  })
})

describe('sorting by how long ago', () => {
  it('puts a never practised entry ahead of a recently practised one', () => {
    const drilled = createEntry(alice.id, entry({ name: 'drilled' }))
    createEntry(alice.id, entry({ name: 'neglected' }))
    logPractice(alice.id, { entry_id: drilled, practiced_at: Date.now(), note: '' })

    const names = listEntries(alice.id, { sort: 'practice' }).map((e) => e.name)
    expect(names).toEqual(['neglected', 'drilled'])
  })

  it('orders two practised entries oldest first', () => {
    const recent = createEntry(alice.id, entry({ name: 'recent' }))
    const stale = createEntry(alice.id, entry({ name: 'stale' }))
    logPractice(alice.id, { entry_id: recent, practiced_at: Date.now(), note: '' })
    logPractice(alice.id, { entry_id: stale, practiced_at: Date.now() - 30 * DAY, note: '' })

    expect(listEntries(alice.id, { sort: 'practice' }).map((e) => e.name)).toEqual(['stale', 'recent'])
  })
})

describe('the history', () => {
  it('returns only your own rows', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    logPractice(alice.id, { entry_id: id, practiced_at: Date.now(), note: 'alice' })
    logPractice(bob.id, { entry_id: id, practiced_at: Date.now(), note: 'bob' })

    expect(listPractice(alice.id).map((s) => s.note)).toEqual(['alice'])
  })

  it('can be filtered to one entry', () => {
    const one = createEntry(alice.id, entry({ name: 'one' }))
    const two = createEntry(alice.id, entry({ name: 'two' }))
    logPractice(alice.id, { entry_id: one, practiced_at: Date.now(), note: '' })
    logPractice(alice.id, { entry_id: two, practiced_at: Date.now(), note: '' })

    expect(listPractice(alice.id, one)).toHaveLength(1)
    expect(listPractice(alice.id, one)[0].entry_name).toBe('one')
  })

  it('marks a row unreadable once the entry is no longer shared', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    logPractice(bob.id, { entry_id: id, practiced_at: Date.now(), note: '' })
    expect(listPractice(bob.id)[0].readable).toBe(true)

    updateEntry(id, alice.id, entry({ is_public: false }))
    // The row stays — bob did practise it — but there is nothing left to open.
    expect(listPractice(bob.id)[0].readable).toBe(false)
  })

  it('lets you delete your own row and nobody else’s', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    logPractice(alice.id, { entry_id: id, practiced_at: Date.now(), note: '' })
    const mine = listPractice(alice.id)[0].id

    expect(deletePracticeSession(mine, bob.id)).toBe(false)
    expect(deletePracticeSession(mine, alice.id)).toBe(true)
    expect(listPractice(alice.id)).toHaveLength(0)
  })

  it('goes away with the entry it points at', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    logPractice(bob.id, { entry_id: id, practiced_at: Date.now(), note: '' })

    deleteEntry(id, alice.id)
    expect(listPractice(bob.id)).toHaveLength(0)
  })

  it('goes away with the user who logged it', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    logPractice(bob.id, { entry_id: id, practiced_at: Date.now(), note: '' })

    getDb().prepare('DELETE FROM users WHERE id = ?').run(bob.id)
    expect(listPractice(bob.id)).toHaveLength(0)
  })
})
