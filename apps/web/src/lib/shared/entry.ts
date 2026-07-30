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

export type SortOrder = 'newest' | 'oldest' | 'name' | 'taktzahl'

export const SORT_VALUES: SortOrder[] = ['newest', 'oldest', 'name', 'taktzahl']

export interface Entry {
  id:             number
  user_id:        number
  owner_username: string
  name:           string
  art:            Art
  taktzahl:       Taktzahl
  video_uri:      string | null
  tags:           string
  note:           string
  is_public:      boolean
  created_at:     number
}

export interface EntryInput {
  name:      string
  art:       Art
  taktzahl:  Taktzahl
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
