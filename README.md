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

## Local development

```sh
pnpm install
pnpm --filter @lindyhop/web dev
pnpm --filter @lindyhop/web test        # authorization rules
pnpm --filter @lindyhop/web typecheck
```

Data lands in `apps/web/.data/` when `DATABASE_PATH` / `VIDEO_DIR` are unset.

**Needs Node ≥ 23.4** for the flagless `node:sqlite` import. `engine-strict` is on,
so an older Node makes `pnpm install` refuse rather than failing later with an
unresolved-module error.

The first account to register becomes the admin, and can close registration from
`/admin`.

## Deploying

Push to the server's bare repo; a `post-receive` hook checks out, builds and reloads
under PM2. Scripts and setup are in [`deploy/`](deploy/README.md).

```sh
git push origin master
```

The app listens on plain HTTP; a reverse proxy in front of it terminates TLS.
**`ORIGIN` must match the URL the browser actually uses** — adapter-node compares it
against the `Origin` header on every POST, so a wrong value breaks login with
"Cross-site POST form submissions are forbidden".

## Your data

```
/srv/data/lindyhop/lindyhop.db   SQLite database — users, sessions, entries
/srv/data/lindyhop/videos/       one file per uploaded video
/srv/data/lindyhop/lindyhop.env  deployment configuration
```

All outside the working tree, so a deploy never touches it. To back up, stop the
app first — SQLite in WAL mode leaves `-wal` and `-shm` files that must travel with
the database:

```sh
pm2 stop lindyhop
tar czf lindyhop-backup.tar.gz -C /srv/data/lindyhop .
pm2 start lindyhop
```

## Configuration

Set in `/srv/data/lindyhop/lindyhop.env`.

| Variable | Default | |
|---|---|---|
| `ORIGIN` | — | **Required.** Public URL, exactly as the browser sees it. |
| `PORT` | `3000` | Port the app listens on. |
| `HOST` | `0.0.0.0` | Set `127.0.0.1` when a proxy on the same host is the only client. |
| `BODY_SIZE_LIMIT` | `1073741824` | Max upload in bytes. adapter-node's own default is 512 KB, which rejects every real video. |
| `DATABASE_PATH` | `/data/lindyhop.db` | |
| `VIDEO_DIR` | `/data/videos` | |

## License

MIT — see [LICENSE](LICENSE).

## Layout

```
apps/web/
  src/lib/server/      database, auth, entries, video storage — server only
  src/lib/api/         the client's fetch wrappers around /api
  src/lib/shared/      the entry vocabulary, used by both sides
  src/lib/components/
  src/routes/          pages, plus the /api endpoints
```
