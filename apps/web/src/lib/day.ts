// Local-day arithmetic for the practice log. The server stores plain epoch
// milliseconds and never groups by day: SQLite would do it in UTC, which puts a
// late-evening session on the wrong day. All of that happens here instead, in
// the browser's own timezone.

const DAY_MS = 24 * 60 * 60 * 1000

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function startOfDay(ms: number): number {
  const date = new Date(ms)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** `YYYY-MM-DD` in local time — the value an `<input type="date">` wants. */
export function toInputDate(ms: number): string {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * `YYYY-MM-DD` back to a timestamp, at **noon** rather than midnight: noon is
 * twelve hours from either edge of the day, so no timezone the server or a
 * second device might use can read it as the day before or after.
 */
export function localNoon(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, 12).getTime()
}

/** Whole local days between that day and today. */
export function daysAgo(ms: number): number {
  // Rounded, not truncated: a day is 23 or 25 hours long across a DST switch.
  return Math.round((startOfDay(Date.now()) - startOfDay(ms)) / DAY_MS)
}

/** Lowercase, for use inside a sentence: "zuletzt vor 3 Tagen". */
export function relativeDay(ms: number): string {
  const days = daysAgo(ms)
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return `am ${formatDay(ms)}`
}

/** Capitalised, for a heading over a day's sessions. */
export function dayHeading(ms: number): string {
  const days = daysAgo(ms)
  if (days <= 0) return 'Heute'
  if (days === 1) return 'Gestern'
  return formatDay(ms)
}

export function formatDay(ms: number): string {
  const date = new Date(ms)
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
}

/**
 * Consecutive days with at least one session, counting back from today. A day
 * with nothing logged yet does not end the streak — it only stops growing —
 * so counting starts at yesterday when today is still empty.
 */
export function streak(timestamps: number[]): number {
  const days = new Set(timestamps.map(startOfDay))

  let cursor = startOfDay(Date.now())
  if (!days.has(cursor)) {
    cursor = startOfDay(cursor - DAY_MS)
    if (!days.has(cursor)) return 0
  }

  let count = 0
  while (days.has(cursor)) {
    count++
    cursor = startOfDay(cursor - DAY_MS)
  }
  return count
}
