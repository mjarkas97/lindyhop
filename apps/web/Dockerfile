# syntax=docker/dockerfile:1

# Node 24 for `node:sqlite`, which is available without a flag from 23.4 on.
# Nothing here needs a C toolchain: the database is built into Node and
# @node-rs/argon2 ships prebuilt binaries.
FROM node:24-bookworm-slim AS builder

RUN corepack enable

WORKDIR /repo

# Manifests first: this layer only busts when a dependency actually changes, so
# editing source does not re-run the install.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile --filter @lindyhop/web...

COPY tsconfig.base.json tsconfig.json ./
COPY apps/web apps/web

RUN pnpm --filter @lindyhop/web build

# Production-only tree: the built server still imports argon2 at runtime, but
# nothing needs vite, svelte or the compilers any more.
RUN pnpm --filter @lindyhop/web --prod deploy --legacy /prod


FROM node:24-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /repo/apps/web/dist ./dist

# The volume is mounted here, so the runtime user has to own it.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

ENV DATABASE_PATH=/data/lindyhop.db \
    VIDEO_DIR=/data/videos \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "dist/index.js"]
