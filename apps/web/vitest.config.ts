import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Separate from vite.config.ts so the production build does not import from
// vitest. The SvelteKit plugin is still needed here: the server modules import
// `$env/dynamic/private` and `$lib/*`, which nothing else resolves.
const scratch = mkdtempSync(join(tmpdir(), 'lindyhop-test-'))

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    // One test file at a time: they all talk to the same SQLite file, and two
    // workers resetting and writing it at once fail with "database is locked".
    fileParallelism: false,
    // Points the database and video dir at a throwaway directory, so a test run
    // can never touch a real .data/ or /data.
    env: {
      DATABASE_PATH: join(scratch, 'test.db'),
      VIDEO_DIR: join(scratch, 'videos'),
    },
  },
})
