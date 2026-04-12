export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  art        TEXT    NOT NULL,
  taktzahl   INTEGER NOT NULL,
  video_uri  TEXT,
  tags       TEXT    NOT NULL DEFAULT '',
  note       TEXT    NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_art     ON entries(art);
`

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
