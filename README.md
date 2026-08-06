# LindyHop

Self-hosted Lindy Hop practice log. Each user keeps their own entries — moves,
sequences and choreographies, each with an optional video — and can mark any of
them public so everyone else on the instance can see it.

Practices are logged against an entry, your own or anyone's public one, and roll up
into a history with a streak and a "lange nicht geübt" sort on the dashboard. Your
practice log is yours alone: the owner of a shared entry never sees who drilled it.

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

**Local development needs Node ≥ 23.4** for the flagless `node:sqlite` import.
`engine-strict` is on, so an older Node makes `pnpm install` refuse rather than
failing later with an unresolved-module error. The server has no such requirement —
it only needs Docker, and the image pins its own Node.

The first account to register becomes the admin, and can close registration from
`/admin`.

## Deploying

Runs as a Docker container. Push to the server's bare repo; a `post-receive` hook
checks out, builds the image and starts it. Scripts and setup are in
[`deploy/`](deploy/README.md).

```sh
git push production master
```

`origin` is GitHub and is only a mirror — GitHub does not run `post-receive` hooks.

By default the container publishes plain HTTP on `127.0.0.1:9930` and a reverse proxy
in front of it terminates TLS. `BIND_ADDR=0.0.0.0` publishes it to the network
instead, reachable at `http://<server-ip>:9930` — see [Reaching it by IP](deploy/README.md#reaching-it-by-ip-without-a-proxy)
for what that costs you.

**`ORIGIN` must match the URL the browser actually uses** — adapter-node compares it
against the `Origin` header on every POST, so a wrong value breaks login with
"Cross-site POST form submissions are forbidden".

## Your data

```
/srv/data/lindyhop/data/lindyhop.db   SQLite database — users, sessions, entries, practices
/srv/data/lindyhop/data/videos/       one file per uploaded video
/srv/data/lindyhop/lindyhop.env       deployment configuration
```

`data/` is bind-mounted into the container at `/data`, so rebuilding the image
never touches it. `lindyhop.env` sits beside it rather than inside it, out of the
container's reach. Both are outside the working tree, so a deploy's `git checkout -f`
leaves them alone.

Every deploy snapshots all of it to `/srv/backups/lindyhop/`, keeping the last seven.
That is a safety net for a bad migration, not a backup schedule — it only fires when
you push. See [deploy/README.md](deploy/README.md#snapshots).

To take one by hand, stop the container first: SQLite in WAL mode leaves `-wal` and
`-shm` files that must travel with the database, and a copy taken mid-write may not
restore.

```sh
docker compose -p lindyhop stop
tar czf lindyhop-backup.tar.gz -C /srv/data/lindyhop .
docker compose -p lindyhop start
```

## Configuration

Set in `/srv/data/lindyhop/lindyhop.env`.

| Variable | Default | |
|---|---|---|
| `ORIGIN` | — | **Required.** Public URL, exactly as the browser sees it. |
| `PORT` | `9930` | Host port. The container always listens on 3000 internally. |
| `BIND_ADDR` | `127.0.0.1` | Host interface the port is published on. `0.0.0.0` exposes it to the network, which then has to be the `ORIGIN`. |
| `BODY_SIZE_LIMIT` | `1073741824` | Max upload in bytes. adapter-node's own default is 512 KB, which rejects every real video. |

`DATABASE_PATH` and `VIDEO_DIR` are pinned by the Dockerfile to `/data/lindyhop.db`
and `/data/videos`; the bind mount decides where they land on the host. They only
need setting when running outside a container.

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
