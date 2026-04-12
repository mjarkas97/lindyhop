import type { SQLiteDatabase } from 'expo-sqlite'
import type { Art, Taktzahl } from './schema'

interface SeedEntry {
  name:     string
  art:      Art
  taktzahl: Taktzahl
  tags:     string
  note:     string
}

const SAMPLES: SeedEntry[] = [
  {
    name: 'Swing Out',
    art: 'figur',
    taktzahl: 8,
    tags: 'basics, partner, 8-count',
    note: 'Classic opening figure. Lead out on 1-4, close on 5-8. Keep the tension in the rock step.',
  },
  {
    name: 'Tuck Turn',
    art: 'figur',
    taktzahl: 8,
    tags: 'turn, follower, variation',
    note: 'Lead a compact turn for the follower on counts 3-4. Plant early, prep late.',
  },
  {
    name: 'Charleston Kicks',
    art: 'sequence',
    taktzahl: 8,
    tags: 'charleston, solo, vintage',
    note: 'Forward kick on 1, back kick on 3, repeat. Hands swing opposition.',
  },
  {
    name: 'California Routine',
    art: 'choreography',
    taktzahl: 10,
    tags: 'showcase, advanced',
    note: 'Open with Swing Out, into tuck turn, finish on a tandem Charleston tag.',
  },
  {
    name: 'Boogie Forward',
    art: 'solo',
    taktzahl: 4,
    tags: 'solo, groove',
    note: 'Four triple-steps forward with a shoulder roll. Loose knees.',
  },
  {
    name: 'Side Pass',
    art: 'figur',
    taktzahl: 6,
    tags: 'basics, 6-count',
    note: 'Simple 6-count pass-by. Good fallback when the phrase is tight.',
  },
]

export function seedIfEmpty(db: SQLiteDatabase): void {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT count(*) as count FROM entries'
  )
  if ((row?.count ?? 0) > 0) return

  const stmt = db.prepareSync(
    `INSERT INTO entries (name, art, taktzahl, video_uri, tags, note, created_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?)`
  )
  try {
    const now = Date.now()
    SAMPLES.forEach((s, i) => {
      stmt.executeSync(s.name, s.art, s.taktzahl, s.tags, s.note, now - i * 1000)
    })
  } finally {
    stmt.finalizeSync()
  }
}
