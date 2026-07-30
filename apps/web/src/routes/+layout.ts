// The UI renders on the client and talks to /api; there is nothing to server-render
// that would not immediately be replaced. hooks.server.ts still guards the document
// request, so the shell never reaches a logged-out visitor.
export const ssr = false
export const prerender = false
