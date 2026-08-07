// The entry vocabulary, shared by the server (validation) and the components
// (labels). Kept free of any import so both sides can use it.

export const ART_VALUES = ['choreography', 'sequence', 'figur', 'solo'] as const
export type Art = (typeof ART_VALUES)[number]

export const ART_LABELS: Record<Art, string> = {
  choreography: 'Choreographie',
  sequence:     'Sequenz',
  figur:        'Figur',
  solo:         'Solo',
}

export const TAKTZAHL_VALUES = [4, 6, 8, 10] as const
export type Taktzahl = (typeof TAKTZAHL_VALUES)[number]

/**
 * A Figur or a Sequenz is a few bars long. A Choreographie or a Solo is a whole
 * routine with no single bar count, and stores `null` instead. The one place
 * that decides this — never test the art inline.
 */
export function hasTaktzahl(art: Art): boolean {
  return art === 'figur' || art === 'sequence'
}

export type SortOrder = 'newest' | 'oldest' | 'name' | 'taktzahl' | 'practice'

export const SORT_VALUES: SortOrder[] = ['newest', 'oldest', 'name', 'taktzahl', 'practice']

export interface Entry {
  id:             number
  user_id:        number
  owner_username: string
  name:           string
  art:            Art
  taktzahl:       Taktzahl | null
  video_uri:      string | null
  tags:           string
  note:           string
  is_public:      boolean
  created_at:     number
  /** Both count the viewer's own practices, never the owner's. */
  practice_count:     number
  last_practiced_at:  number | null
}

export interface EntryInput {
  name:      string
  art:       Art
  taktzahl:  Taktzahl | null
  video_uri: string | null
  tags:      string
  note:      string
  is_public: boolean
}

export function isArt(value: unknown): value is Art {
  return typeof value === 'string' && (ART_VALUES as readonly string[]).includes(value)
}

export function isTaktzahl(value: unknown): value is Taktzahl {
  return typeof value === 'number' && (TAKTZAHL_VALUES as readonly number[]).includes(value)
}

export function isSortOrder(value: unknown): value is SortOrder {
  return typeof value === 'string' && (SORT_VALUES as string[]).includes(value)
}
