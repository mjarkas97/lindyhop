# Deploy

Push-to-deploy: a bare repo with a `post-receive` hook that checks out, builds the
image and starts the container.

```
/srv/repositories/lindyhop.git   bare repo, hooks/post-receive
/srv/vhosts/lindyhop             working tree — only ever a build context
/srv/scripts/                    the two scripts in this directory
/srv/data/lindyhop/lindyhop.env  configuration
/srv/data/lindyhop/data/         database and videos, bind-mounted at /data
/srv/backups/lindyhop/           tarballs, last 7 kept
```

`origin` is GitHub and is a plain mirror — **GitHub does not run `post-receive` hooks.**
Deploying means pushing to the server:

```sh
git push production master
```

## Install

| Script | Does |
|---|---|
| `lindyhop-checkout` | backs the tree up, then checks out the pushed branch |
| `lindyhop-deploy` | builds the image and starts the container |

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

## Configuration

`/srv/data/lindyhop/lindyhop.env`, deliberately **outside** both the working tree
(which `git checkout -f` overwrites) and `data/` (which the container mounts).

```sh
ORIGIN=https://lindyhop.example.com
PORT=9930
BODY_SIZE_LIMIT=1073741824
```

`lindyhop-deploy` passes it to `docker compose --env-file`, so these are compose
variables. `PORT` picks the published host port; the container always listens on
3000 internally.

`ORIGIN` must be the URL the browser actually uses. adapter-node compares it
against the `Origin` header on every POST, so a wrong value fails only at login,
with "Cross-site POST form submissions are forbidden".

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

## Migrating off PM2

The app previously ran under PM2 as `www-data`. It never successfully started —
its entry was `pm2 start npm -- run start`, against a root `start` script that does
not exist. Remove it once:

```sh
sudo -u www-data pm2 delete lindyhop
sudo -u www-data pm2 save
sudo rm -rf /srv/vhosts/lindyhop/node_modules   # stale host install
```

PM2 keeps its process list per user under `$HOME/.pm2`, so `sudo -u www-data` is
required — a bare `pm2 list` talks to a different, empty daemon. Other apps on the
daemon are unaffected.

Reboot survival comes from `restart: unless-stopped` in the compose file; there is
no `pm2 save` equivalent to remember.

## Why not npm

The original scripts ran `npm ci --omit=dev` and `npm run build` on the host.
Neither could work against this repo, and the same constraints are why the image
uses pnpm:

- It is a **pnpm workspace**. `pnpm-workspace.yaml` declares `apps/*` and the root
  `package.json` has no `workspaces` field, so npm cannot see `apps/web`.
- `--omit=dev` drops vite, svelte, adapter-node, sass and turbo. The build needs
  all of them. The Dockerfile installs everything, builds, and only then reduces to
  a production tree with `pnpm --prod deploy`.
- `pm2 start npm -- run start` expected a root `start` script that does not exist;
  only `apps/web` has one.
