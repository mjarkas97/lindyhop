// Runtime configuration, read once at startup. Everything has a development
// default that keeps `vite dev` working with no .env file; the container sets
// all of them explicitly.

import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { resolve } from 'node:path'

/** SQLite file. Lives on the data volume, so redeploying never touches it. */
export const DATABASE_PATH = resolve(env.DATABASE_PATH ?? (dev ? '.data/lindyhop.db' : '/data/lindyhop.db'))

/** Uploaded videos, one file per upload. Also on the data volume. */
export const VIDEO_DIR = resolve(env.VIDEO_DIR ?? (dev ? '.data/videos' : '/data/videos'))

/**
 * Public URL of the instance. adapter-node compares it against the Origin header
 * on every POST, so behind a reverse proxy it must be the externally visible URL
 * or every form submission is rejected as cross-origin.
 */
export const ORIGIN = env.ORIGIN ?? ''

/** Session cookies are only marked Secure on https — on plain http the browser drops them. */
export const SECURE_COOKIES = ORIGIN.startsWith('https://')

/**
 * Called from the `init` hook, never at module scope: SvelteKit imports every
 * server module during the build to analyse it, and a throw up there would make
 * the image unbuildable without baking in a runtime value.
 */
export function validateEnv(): void {
  if (!dev && !ORIGIN) {
    throw new Error('ORIGIN must be set in production — adapter-node rejects cross-origin POSTs without it.')
  }
}
