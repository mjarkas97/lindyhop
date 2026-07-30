import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Entries, users and videos live on the server now, so there is a server
    // runtime to build. `dist` rather than the adapter default `build`, to match
    // turbo.json's outputs.
    adapter: adapter({ out: 'dist' }),
  },
}
