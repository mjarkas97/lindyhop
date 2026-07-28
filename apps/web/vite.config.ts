import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig, type Plugin } from 'vite'

// The SQLite OPFS VFS only loads on a cross-origin-isolated page, so both headers
// are mandatory. They apply to `vite dev` and `vite preview` only — the deploy
// container (MJ-27) has to send the same two itself.
//
// `server.headers` is not enough: SvelteKit serves page requests through its own
// dev handler, which never passes through that config. A middleware registered
// ahead of SvelteKit's sets them on every response instead.
const CROSS_ORIGIN_ISOLATION: Record<string, string> = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

function crossOriginIsolation(): Plugin {
  const middleware = (_req: unknown, res: { setHeader(k: string, v: string): void }, next: () => void) => {
    for (const [key, value] of Object.entries(CROSS_ORIGIN_ISOLATION)) {
      res.setHeader(key, value)
    }
    next()
  }
  return {
    name: 'lindyhop-cross-origin-isolation',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [crossOriginIsolation(), sveltekit()],
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
})
