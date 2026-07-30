# Deploy

Push-to-deploy: a bare repo with a `post-receive` hook that checks out, builds and
reloads under PM2.

```
/srv/repositories/lindyhop.git   bare repo, hooks/post-receive
/srv/vhosts/lindyhop             working tree, checked out here
/srv/scripts/                    the three scripts in this directory
/srv/data/lindyhop/              database, videos and lindyhop.env
/srv/backups/lindyhop/           tarballs, last 7 kept
```

## Install

Names match what is already on the server:

| Script | Does |
|---|---|
| `lindyhop-checkout` | backs the tree up, then checks out the pushed branch |
| `lindyhop-helper` | installs dependencies and builds |
| `lindyhop-deploy` | starts or reloads PM2 |

```sh
sudo cp deploy/lindyhop-{checkout,helper,deploy} /srv/scripts/
sudo chmod +x /srv/scripts/lindyhop-*
cp deploy/post-receive /srv/repositories/lindyhop.git/hooks/
chmod +x /srv/repositories/lindyhop.git/hooks/post-receive
```

The `chmod +x` is what the `Permission denied` on `/srv/scripts/lindyhop-checkout`
was about — the hook could not execute it.

The `git` user runs the scripts through `sudo`, so `visudo` needs all three:

```
git ALL=(ALL) NOPASSWD: /srv/scripts/lindyhop-checkout, /srv/scripts/lindyhop-helper, /srv/scripts/lindyhop-deploy
```

## Configuration

`/srv/data/lindyhop/lindyhop.env`, deliberately **outside** the working tree —
`git checkout -f` and the `chown`/`chmod` in `lindyhop-helper` would otherwise
overwrite it on every deploy.

```sh
ORIGIN=https://lindyhop.example.com
PORT=9930
HOST=127.0.0.1
DATABASE_PATH=/srv/data/lindyhop/lindyhop.db
VIDEO_DIR=/srv/data/lindyhop/videos
BODY_SIZE_LIMIT=1073741824
```

`ORIGIN` must be the URL the browser actually uses. adapter-node compares it
against the `Origin` header on every POST, so a wrong value fails only at login,
with "Cross-site POST form submissions are forbidden".

`BODY_SIZE_LIMIT` must be raised — adapter-node's default is 512 KB, which rejects
every real video.

The PM2 process needs write access to `/srv/data/lindyhop/`. It must not point at
anything inside `/srv/vhosts/lindyhop`, which `lindyhop-helper` chmods to `570`.

## Requirements

**Node ≥ 23.4.** The app uses the built-in `node:sqlite`, which needs no flag from
23.4 on. `engine-strict=true` is set, so an older Node makes `pnpm install` refuse
outright rather than failing later with an unresolved-module error.

pnpm comes from `corepack enable`, pinned by `packageManager` in the root
`package.json`.

### Upgrading Node

`node:sqlite` arrived in 22.5.0, so nothing below that can run this app under any
flag.

First find out how Node got there — it decides everything else:

```sh
which node && node -v
dpkg -l | grep -i nodejs      # apt or NodeSource
ls ~/.nvm ~/.fnm 2>/dev/null  # per-user version manager
```

**If it is apt / NodeSource** (installs to `/usr/bin`, visible to every user):

```sh
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

**If it is nvm or fnm**, mind that the deploy scripts run under `sudo` and so get
**root's** `PATH`, not the git user's. A version manager installed for one user is
invisible to them. Either install Node system-wide as above, or give the scripts an
absolute path to the right binary.

Afterwards, in this order:

```sh
sudo corepack enable                            # shims live in the Node install; a new Node needs it again
sudo -u www-data pm2 update                     # restarts the PM2 daemon under the new Node
sudo rm -rf /srv/vhosts/lindyhop/node_modules   # once, to clear anything built for the old runtime
```

`pm2 update` is the one that gets missed: without it the daemon keeps running the
old Node in memory and restarts the app under it.

**PM2 runs as `www-data`.** Its process list is per user, under `$HOME/.pm2`, so a
bare `pm2 list` as yourself or under `sudo` talks to a different, empty daemon.
Always `sudo -u www-data pm2 ...`.

### Two Node installations

This server had a manual Node in `/usr/local/bin` shadowing the apt one in
`/usr/bin`, and `which node` only ever showed the winner:

```sh
which node && node -v        # /usr/local/bin/node — manual install
dpkg -l | grep -w nodejs     # /usr/bin/node — apt package, a different version
sudo -i node -v              # what the deploy scripts actually see
```

Installing a newer Node through apt does **not** help while the `/usr/local` copy
is still first on `PATH`. Remove it, then confirm with `sudo -i node -v` — that is
the version the scripts get, and the only one that matters here.

Then push again, or re-run the scripts by hand:

```sh
sudo /srv/scripts/lindyhop-helper /srv/vhosts/lindyhop
sudo /srv/scripts/lindyhop-deploy /srv/vhosts/lindyhop
```

## Why not npm

The previous scripts ran `npm ci --omit=dev` and `npm run build`. Neither could
work against this repo:

- It is a **pnpm workspace**. `pnpm-workspace.yaml` declares `apps/*` and the root
  `package.json` has no `workspaces` field, so npm cannot see `apps/web`.
- `--omit=dev` drops vite, svelte, adapter-node, sass and turbo. The build needs
  all of them.
- `pm2 start npm -- run start` expected a root `start` script that does not exist;
  only `apps/web` has one. PM2 now runs `apps/web/dist/index.js` directly.
