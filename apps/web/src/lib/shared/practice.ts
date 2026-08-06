// The practice vocabulary, shared by the server (validation) and the components.
// Kept beside the entry vocabulary and just as import-free, so both sides can use it.

import type { Art } from './entry'

/** Notes here are a one-line reminder ("Tempo zu schnell"), not a second entry note. */
export const MAX_PRACTICE_NOTE = 500

export interface PracticeInput {
  entry_id: number
  /**
   * Epoch ms. The client sends `Date.now()` for today and local noon of the
   * chosen day when backdating — noon is far enough from both midnights that no
   * UTC offset can move it to a neighbouring day.
   */
  practiced_at: number
  note: string
}

export interface PracticeSession {
  id:           number
  entry_id:     number
  entry_name:   string
  art:          Art
  practiced_at: number
  note:         string
  /** Whether the entry is still readable — a shared one may since have been made private. */
  readable:     boolean
}
