import { beforeEach, describe, expect, it } from 'vitest'
import { getDb } from './db'
import { authenticate, createUser, type User } from './auth'
import {
  createEntry,
  deleteEntry,
  getEntry,
  getOwnedEntry,
  listEntries,
  parseEntryInput,
  updateEntry,
} from './entries'
import { canReadVideo, isValidVideoName } from './videos'
import type { EntryInput } from '$lib/shared/entry'

// These are the rules where a regression is actually dangerous: everything that
// decides whether one user can see or change another user's things.

const PASSWORD = 'lindyhop123'

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
  // Cascades take entries and sessions with them, so this is a full reset.
  getDb().exec('DELETE FROM users')
  alice = (await createUser('alice', PASSWORD))!
  bob = (await createUser('bob', PASSWORD))!
})

describe('registration', () => {
  it('makes the first account an admin and no later one', () => {
    expect(alice.is_admin).toBe(true)
    expect(bob.is_admin).toBe(false)
  })

  it('refuses a username already taken', async () => {
    expect(await createUser('alice', PASSWORD)).toBeNull()
  })
})

describe('login', () => {
  it('accepts the right password', async () => {
    expect(await authenticate('alice', PASSWORD)).not.toBeNull()
  })

  it('rejects a wrong password', async () => {
    expect(await authenticate('alice', 'wrongwrong')).toBeNull()
  })

  it('rejects an account that does not exist', async () => {
    expect(await authenticate('nobody', PASSWORD)).toBeNull()
  })
})

describe('reading an entry', () => {
  it('lets the owner read their own private entry', () => {
    const id = createEntry(alice.id, entry())
    expect(getEntry(id, alice.id)?.name).toBe('Swing Out')
  })

  it('hides a private entry from everyone else', () => {
    const id = createEntry(alice.id, entry())
    expect(getEntry(id, bob.id)).toBeNull()
  })

  it('shows a public entry to another user', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    expect(getEntry(id, bob.id)?.owner_username).toBe('alice')
  })

  it('returns null for an id that does not exist, same as forbidden', () => {
    // The route turns both into 404 — a 403 would confirm the id exists.
    expect(getEntry(9999, alice.id)).toBeNull()
  })
})

describe('writing an entry', () => {
  it('refuses a non-owner even when the entry is public', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    // getOwnedEntry is what the PUT and DELETE routes gate on.
    expect(getOwnedEntry(id, bob.id)).toBeNull()
  })

  it('does not update someone else’s entry', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    expect(updateEntry(id, bob.id, entry({ name: 'hijacked' }))).toBe(false)
    expect(getEntry(id, alice.id)?.name).toBe('Swing Out')
  })

  it('does not delete someone else’s entry', () => {
    const id = createEntry(alice.id, entry({ is_public: true }))
    expect(deleteEntry(id, bob.id)).toBe(false)
    expect(getEntry(id, alice.id)).not.toBeNull()
  })

  it('lets the owner update and delete', () => {
    const id = createEntry(alice.id, entry())
    expect(updateEntry(id, alice.id, entry({ name: 'Tuck Turn' }))).toBe(true)
    expect(getEntry(id, alice.id)?.name).toBe('Tuck Turn')
    expect(deleteEntry(id, alice.id)).toBe(true)
    expect(getEntry(id, alice.id)).toBeNull()
  })
})

describe('listing entries', () => {
  it('shows a user only their own', () => {
    createEntry(alice.id, entry({ name: 'alice private' }))
    createEntry(bob.id, entry({ name: 'bob private' }))
    const mine = listEntries(bob.id, { scope: 'mine' })
    expect(mine.map((e) => e.name)).toEqual(['bob private'])
  })

  it('shows every user’s public entries under the public scope', () => {
    createEntry(alice.id, entry({ name: 'alice public', is_public: true }))
    createEntry(alice.id, entry({ name: 'alice private' }))
    createEntry(bob.id, entry({ name: 'bob public', is_public: true }))
    const names = listEntries(bob.id, { scope: 'public' }).map((e) => e.name).sort()
    expect(names).toEqual(['alice public', 'bob public'])
  })

  it('filters by search across name, tags and note', () => {
    createEntry(alice.id, entry({ name: 'Charleston', tags: 'vintage', note: '' }))
    createEntry(alice.id, entry({ name: 'Swing Out', tags: 'basics', note: 'rock step' }))
    expect(listEntries(alice.id, { search: 'vintage' })).toHaveLength(1)
    expect(listEntries(alice.id, { search: 'rock' })).toHaveLength(1)
    expect(listEntries(alice.id, { search: 'nothing' })).toHaveLength(0)
  })
})

describe('reading a video', () => {
  const NAME = '00000000-0000-4000-8000-000000000000.mp4'

  it('is readable by the owner of the entry using it', () => {
    createEntry(alice.id, entry({ video_uri: NAME }))
    expect(canReadVideo(NAME, alice.id)).toBe(true)
  })

  it('is hidden from others while the entry is private', () => {
    createEntry(alice.id, entry({ video_uri: NAME }))
    expect(canReadVideo(NAME, bob.id)).toBe(false)
  })

  it('is readable by others once the entry is public', () => {
    createEntry(alice.id, entry({ video_uri: NAME, is_public: true }))
    expect(canReadVideo(NAME, bob.id)).toBe(true)
  })

  it('is readable by nobody while no entry references it', () => {
    // An upload that was never saved belongs to no one, including its uploader.
    expect(canReadVideo(NAME, alice.id)).toBe(false)
  })

  it('rejects any name this server did not generate', () => {
    expect(isValidVideoName(NAME)).toBe(true)
    expect(isValidVideoName('../../etc/passwd')).toBe(false)
    expect(isValidVideoName('/etc/passwd')).toBe(false)
    expect(isValidVideoName('nice-try.mp4')).toBe(false)
    expect(isValidVideoName(`${NAME}/../../secret`)).toBe(false)
  })
})

describe('parseEntryInput', () => {
  const valid = { ...entry(), name: 'Swing Out' }

  it('accepts a well-formed entry', () => {
    const result = parseEntryInput(valid)
    expect(result).toHaveProperty('input')
  })

  it('trims the name and rejects a blank one', () => {
    expect(parseEntryInput({ ...valid, name: '  Swing Out  ' })).toMatchObject({
      input: { name: 'Swing Out' },
    })
    expect(parseEntryInput({ ...valid, name: '   ' })).toHaveProperty('error')
  })

  it('rejects an art or taktzahl outside the vocabulary', () => {
    expect(parseEntryInput({ ...valid, art: 'bogus' })).toHaveProperty('error')
    expect(parseEntryInput({ ...valid, taktzahl: 7 })).toHaveProperty('error')
  })

  it('rejects a forged video_uri', () => {
    expect(parseEntryInput({ ...valid, video_uri: '../../etc/passwd' })).toHaveProperty('error')
  })

  it('treats anything but true as private', () => {
    expect(parseEntryInput({ ...valid, is_public: 'yes' })).toMatchObject({
      input: { is_public: false },
    })
    expect(parseEntryInput({ ...valid, is_public: true })).toMatchObject({
      input: { is_public: true },
    })
  })

  it('rejects a non-object body', () => {
    expect(parseEntryInput(null)).toHaveProperty('error')
    expect(parseEntryInput('nope')).toHaveProperty('error')
  })
})
