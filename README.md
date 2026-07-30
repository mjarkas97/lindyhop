# LindyHop

Self-hosted Lindy Hop practice log. Each user keeps their own entries — moves,
sequences and choreographies, each with an optional video — and can mark any of
them public so everyone else on the instance can see it.

German UI, dark theme, installable as a PWA.

## Stack

- SvelteKit 2 + Svelte 5 (runes), TypeScript, SCSS
- `adapter-node` — a Node server with a client-rendered UI
- SQLite via Node's built-in `node:sqlite`, so there is no native addon to compile
- Session cookies, passwords hashed with argon2
- Videos stored as files, streamed with HTTP Range support
- pnpm workspaces + Turborepo

## Run it

```sh
cp .env.example .env      # then set ORIGIN to your public URL
docker compose up -d --build
```

The container publishes plain HTTP on `${PORT:-3000}`; put your own reverse proxy
in front of it for TLS. **`ORIGIN` must match the URL the browser actually uses** —
adapter-node rejects cross-origin POSTs, so a wrong value breaks login with
"Cross-site POST form submissions are forbidden".

The first account to register becomes the admin. Registration is open after that.

### Local development

```sh
pnpm install
pnpm --filter @lindyhop/web dev
pnpm --filter @lindyhop/web test        # authorization rules
pnpm --filter @lindyhop/web typecheck
```

Data lands in `apps/web/.data/` when `DATABASE_PATH` / `VIDEO_DIR` are unset.

**Needs Node ≥ 23.4** for the flagless `node:sqlite` import; the images use Node 24.
`engine-strict` is on, so an older Node fails at `pnpm install` rather than with an
unresolved-module error at runtime.

Or in a container: `docker compose --profile dev up`.

## Your data

Bind-mounted from `/srv/data/lindyhop/data` on the host to `/data` in the container:

```
/data/lindyhop.db   SQLite database — users, sessions, entries
/data/videos/       one file per uploaded video
```

Rebuilding or replacing the image never touches it. To back up, stop the container
and copy the directory — SQLite in WAL mode leaves `-wal` and `-shm` files that must
travel with the database:

```sh
docker compose stop app
tar czf lindyhop-backup.tar.gz -C /srv/data/lindyhop/data .
docker compose start app
```

## Configuration

| Variable | Default | |
|---|---|---|
| `ORIGIN` | — | **Required.** Public URL, exactly as the browser sees it. |
| `PORT` | `3000` | Host port the container publishes. |
| `BODY_SIZE_LIMIT` | `1073741824` | Max upload in bytes. adapter-node's own default is 512 KB, which rejects every real video. |
| `DATABASE_PATH` | `/data/lindyhop.db` | |
| `VIDEO_DIR` | `/data/videos` | |

## Layout

```
apps/web/
  src/lib/server/      database, auth, entries, video storage — server only
  src/lib/api/         the client's fetch wrappers around /api
  src/lib/shared/      the entry vocabulary, used by both sides
  src/lib/components/
  src/routes/          pages, plus the /api endpoints
```
