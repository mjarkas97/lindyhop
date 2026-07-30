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
PORT=3000
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

## Why not npm

The previous scripts ran `npm ci --omit=dev` and `npm run build`. Neither could
work against this repo:

- It is a **pnpm workspace**. `pnpm-workspace.yaml` declares `apps/*` and the root
  `package.json` has no `workspaces` field, so npm cannot see `apps/web`.
- `--omit=dev` drops vite, svelte, adapter-node, sass and turbo. The build needs
  all of them.
- `pm2 start npm -- run start` expected a root `start` script that does not exist;
  only `apps/web` has one. PM2 now runs `apps/web/dist/index.js` directly.
