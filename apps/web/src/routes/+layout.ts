// SPA: no prerender, no server render. The whole app depends on OPFS and SQLite WASM,
// neither of which exists at build time.
export const ssr = false
export const prerender = false
