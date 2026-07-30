import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  // @node-rs/argon2 resolves a prebuilt .node binary per platform; bundling it
  // would break that lookup.
  ssr: { external: ['@node-rs/argon2'] },
})
