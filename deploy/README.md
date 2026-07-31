# Deploy

Push-to-deploy: a bare repo with a `post-receive` hook that checks out, builds the
image and starts the container.

```
/srv/repositories/lindyhop.git   bare repo, hooks/post-receive
/srv/vhosts/lindyhop             working tree — only ever a build context
/srv/scripts/                    the two scripts in this directory
/srv/data/lindyhop/lindyhop.env  configuration
/srv/data/lindyhop/data/         database and videos, bind-mounted at /data
/srv/backups/lindyhop/           data snapshots, last 7 kept
```

`origin` is GitHub and is a plain mirror — **GitHub does not run `post-receive` hooks.**
Deploying means pushing to the server:

```sh
git push production master
```

## Install

| Script | Does |
|---|---|
| `lindyhop-checkout` | checks out the pushed branch into the working tree |
| `lindyhop-deploy` | builds the image, snapshots the data, starts the container |

```sh
sudo cp deploy/lindyhop-{checkout,deploy} /srv/scripts/
sudo chmod +x /srv/scripts/lindyhop-*
cp deploy/post-receive /srv/repositories/lindyhop.git/hooks/
chmod +x /srv/repositories/lindyhop.git/hooks/post-receive
```

The `chmod +x` is what the `Permission denied` on `/srv/scripts/lindyhop-checkout`
was about — the hook could not execute it.

The `git` user runs the scripts through `sudo`, so `visudo` needs both:

```
git ALL=(ALL) NOPASSWD: /srv/scripts/lindyhop-checkout, /srv/scripts/lindyhop-deploy
```

## Requirements

Docker with the Compose v2 plugin, and nothing else:

```sh
docker --version && docker compose version
```

The host does **not** need Node. `node:24-bookworm-slim` is pinned in the
Dockerfile, which is the entire reason for containerising this: the version
that matters is the one in the image, not the one on `PATH`.

Nothing in the image needs a C toolchain either — SQLite is built into Node as
`node:sqlite`, and `@node-rs/argon2` ships prebuilt binaries.

Reboot survival comes from `restart: unless-stopped` in the compose file. There is
nothing to remember and nothing to save — Docker brings the container back on its
own.

## Configuration

`/srv/data/lindyhop/lindyhop.env`, deliberately **outside** both the working tree
(which `git checkout -f` overwrites) and `data/` (which the container mounts).

```sh
ORIGIN=https://lindyhop.example.com
PORT=9930
BIND_ADDR=127.0.0.1
BODY_SIZE_LIMIT=1073741824
```

`lindyhop-deploy` passes it to `docker compose --env-file`, so these are compose
variables. `PORT` and `BIND_ADDR` pick the published host address; the container
always listens on `0.0.0.0:3000` internally.

`ORIGIN` must be the URL the browser actually uses. adapter-node compares it
against the `Origin` header on every POST, so a wrong value fails only at login,
with "Cross-site POST form submissions are forbidden".

### Reaching it by IP, without a proxy

`ORIGIN` is a URL, never a bind address — `0.0.0.0` is not a valid value for it.
Exposing the app on the network takes both halves:

```sh
BIND_ADDR=0.0.0.0
ORIGIN=http://192.0.2.10:9930   # scheme, IP and port; no trailing slash
```

Then `sudo /srv/scripts/lindyhop-deploy /srv/vhosts/lindyhop` to republish the port.

Two things to know before leaving it that way:

- **The session cookie stops being `Secure`.** `SECURE_COOKIES` in
  `apps/web/src/lib/server/env.ts` is derived from whether `ORIGIN` starts with
  `https://` — it has to be, or the browser would discard a Secure cookie sent over
  plain http and login would appear to silently fail. On `http://` the login POST
  and the session cookie both cross the network in the clear.
- **A published Docker port bypasses ufw.** Docker inserts its own iptables rules
  ahead of the INPUT chain, so a `deny incoming` default policy does not cover it.
  Restrict it with `BIND_ADDR` set to a specific interface, or with a `DOCKER-USER`
  chain rule.

Fine for testing on a trusted LAN. For anything reachable from the internet, put
the reverse proxy back in front, set `BIND_ADDR=127.0.0.1` and give `ORIGIN` the
`https://` name.

`BODY_SIZE_LIMIT` must be raised — adapter-node's default is 512 KB, which rejects
every real video.

`DATABASE_PATH` and `VIDEO_DIR` are not set here. The Dockerfile pins them to
`/data/lindyhop.db` and `/data/videos`; the bind mount decides where that lands.

## The data directory has to be owned by uid 1000

The container runs as `USER node`, uid 1000. A bind mount overrides the
Dockerfile's `chown node:node /data` — the **host** directory's ownership is what
the container sees. `lindyhop-deploy` handles it:

```sh
mkdir -p /srv/data/lindyhop/data/videos
chown -R 1000:1000 /srv/data/lindyhop/data
```

Get it wrong and the container starts, then fails its healthcheck against
`/api/health` because SQLite cannot write. That endpoint runs a real query
precisely so this shows up as **unhealthy** rather than as a container that looks
up and serves errors.

## Snapshots

`lindyhop-deploy` tars `/srv/data/lindyhop` into
`/srv/backups/lindyhop/lindyhop-data-<date>.tar.gz` on every deploy, keeping the
seven most recent. The archive holds `./data/` and `./lindyhop.env` — the database,
the videos and the configuration, which is everything on the box that is not in
git.

The order is what makes it correct: **build, stop, snapshot, start.** Building is
the slow step and touches no data, so the old container keeps serving through it.
The stop is not optional — SQLite in WAL mode can be mid-write, and a tar of a live
`.db` alongside its `-wal` is not guaranteed to restore. And because the snapshot is
taken before the *new* container starts, it is the state to roll back to when a
migration goes wrong.

`/srv/backups/lindyhop` holds password hashes, so the script keeps it at `chmod 700`.
It used to contain nothing but source code; that is no longer true.

**This is a pre-deploy safety net, not a backup schedule.** It fires when you deploy,
while the data changes every day — go a month without pushing and the newest snapshot
is a month old. For real backups, put a systemd timer or a cron job on the same
`docker compose -p lindyhop stop` / `tar` / `start` sequence, and copy the result off
the machine.

To restore, stop the container, **clear the old data directory**, extract, and put the
ownership back:

```sh
docker compose -p lindyhop stop
sudo rm -rf /srv/data/lindyhop/data
sudo tar xzf /srv/backups/lindyhop/lindyhop-data-<date>.tar.gz -C /srv/data/lindyhop
sudo chown -R 1000:1000 /srv/data/lindyhop/data
docker compose -p lindyhop start
```

The `rm -rf` is not optional. A cleanly stopped SQLite checkpoints and deletes its
`-wal` and `-shm`, so the archive usually has neither — extracting over a live
directory would restore an old `.db` next to the *current* `-wal` and hand SQLite two
inconsistent halves of different databases.

## Why not npm

The original scripts ran `npm ci --omit=dev` and `npm run build` on the host.
Neither could work against this repo, and the same constraints are why the image
uses pnpm:

- It is a **pnpm workspace**. `pnpm-workspace.yaml` declares `apps/*` and the root
  `package.json` has no `workspaces` field, so npm cannot see `apps/web`.
- `--omit=dev` drops vite, svelte, adapter-node, sass and turbo. The build needs
  all of them. The Dockerfile installs everything, builds, and only then reduces to
  a production tree with `pnpm --prod deploy`.
