# LindyHop Web — Project Notes

Lindy Hop practice app. Users create **entries** (moves/sequences/choreos), each with an
optional video. Multi-user, self-hosted, German UI.

Succeeds a local-only Expo app and a local-only OPFS/SQLite-WASM PWA. Both are gone;
if you find a reference to `expo-*`, OPFS, `@sqlite.org/sqlite-wasm` or NextCloud sync,
it is stale.

## Stack

- SvelteKit 2 + Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- `@sveltejs/adapter-node`, output to `dist/`
- `node:sqlite` (`DatabaseSync`) — built into Node, needs ≥ 23.4 without a flag
- `@node-rs/argon2` — prebuilt binaries, no compiler needed
- SCSS with 2-space indent, BEM via `&__element` nesting, state via attribute selectors

## Shape

Client SPA (`ssr = false` in `routes/+layout.ts`) talking to a JSON API. Not form
actions: `EntryForm` and `VideoPicker` are built on callback props driving custom
controls, so form actions would mean rewriting both around hidden inputs.

`hooks.server.ts` is the only guard. It resolves the session, returns 401 for
`/api/*` and redirects document requests to `/login`. Static assets never reach it —
adapter-node's sirv middleware serves them first, which is what lets the login page
load its own JS.

`export const init` in `hooks.server.ts` does the boot work (env validation, video
sweeper). It must not move to module scope: SvelteKit imports every server module
during the build's analyse pass, so a top-level throw makes the image unbuildable
and a top-level `mkdir` writes to the data volume at build time.

## Data model

```sql
users             (id, username UNIQUE, password_hash, is_admin, created_at)
sessions          (id = sha256(token), user_id, expires_at)
entries           (id, user_id, name, art, taktzahl, video_uri, tags, note, is_public, created_at)
practice_sessions (id, user_id, entry_id, practiced_at, note)
```

- `art` ∈ `choreography | sequence | figur | solo`, `taktzahl` ∈ `4 | 6 | 8 | 10` —
  both in `src/lib/shared/entry.ts` with the German labels
- `tags` is a comma-separated string, not a table — carried over deliberately
- `video_uri` is a bare `<uuid>.<ext>` filename under `VIDEO_DIR`
- `practice_sessions.user_id` is **who practised**, not the entry's owner — you may log
  a practice on anything you can read, so two people can have their own history on the
  same public entry
- Migrations: append to the `MIGRATIONS` array in `src/lib/server/db/schema.ts`,
  never edit a step that has already run

## Key files

- `src/lib/server/db/index.ts` — singleton, WAL, `queryAll`/`queryOne` (the only
  place `node:sqlite`'s loose row types are cast), `transaction()`
- `src/lib/server/auth.ts` — argon2, sessions, `validateCredentials`
- `src/lib/server/entries.ts` — all entry SQL plus `parseEntryInput`. Every read joins
  the viewer's own practice totals; the subquery's `?` binds *before* the WHERE
  parameters, so the viewer id goes first
- `src/lib/server/practice.ts` — practice SQL plus `parsePracticeInput`
- `src/lib/day.ts` — local-day maths (grouping, streak, "vor 3 Tagen"). The server
  stores plain epoch ms and never groups by day, because SQLite would do it in UTC
- `src/lib/server/videos.ts` — filename validation, read authz, orphan sweep
- `src/lib/api/*` — client mirrors; `entries.ts` keeps the exact signatures the old
  OPFS query module had, which is why the components barely changed
- `src/lib/stores/entries.ts` — shared by `/` and `/discover`; whichever is mounted
  owns `options`, and `scope` is the only difference

## Authorization rules

- Read an entry: owner **or** `is_public`. Write: owner only.
- Log a practice on it: anything you can read. Read or delete a practice row: only the
  user who logged it — even the entry's owner cannot see it.
- Someone else's entry answers **404, never 403** — a 403 confirms the id exists.
- A video is readable only through an entry that references it. An uploaded but
  unattached file is readable by nobody, including its uploader.
- Filenames are matched against `/^[a-f0-9-]{36}\.[a-z0-9]{1,5}$/` before touching
  `path.join`, so traversal cannot happen.

## Video lifecycle

The client never deletes a video. The server owns all of it:
- entry updated with a different `video_uri` → old file unlinked
- entry deleted → its file unlinked
- uploaded but never attached → orphan sweep, at boot and every 6h, 24h grace

The 24h grace is what stops the sweep from racing an upload in flight.

Uploads are raw-body `POST /api/videos`, not multipart — `request.formData()` would
buffer the whole video in memory. Playback needs `Range`/206 or the timeline cannot
be scrubbed.

## Conventions

- German UI throughout ("Choreographie", "Sequenz", "Figur", "Solo", "Neueste",
  "Älteste", "Takte", "Privat", "Öffentlich", "Anmelden", "Registrieren")
- Dark palette, accent amber `#f59e0b`; tokens in `src/lib/styles/_tokens.scss`
- Bottom-anchored buttons use the `safe-bottom()` helper — gesture bars overlap otherwise
- Filter rows are `flex-wrap`, not horizontal scroll: German labels get clipped
- Plain hyphen in chip labels, no en-dash (renders as tofu in some fonts)
- Error messages returned by the API are already German and safe to show as-is

## Commands

```sh
pnpm --filter @lindyhop/web dev
pnpm --filter @lindyhop/web typecheck   # svelte-check, must stay at 0 errors
pnpm --filter @lindyhop/web build
```

## Gotchas

- `ORIGIN` must be the externally visible URL or every POST 403s behind a proxy
- `BODY_SIZE_LIMIT` defaults to 512 KB in adapter-node — far too small for video
- `node:sqlite` rows are `Record<string, SQLOutputValue>`; go through
  `queryAll`/`queryOne` rather than casting at each call site
- `Segmented` is generic over `string | number | boolean`; the boolean case is the
  visibility toggle
