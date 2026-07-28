import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // No server runtime — the app is local-only, everything lives in the browser.
    // `dist` rather than the adapter default `build`, to match turbo.json's outputs.
    adapter: adapter({ pages: 'dist', assets: 'dist', fallback: 'index.html' }),
  },
}
