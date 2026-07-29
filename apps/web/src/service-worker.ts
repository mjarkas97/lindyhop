/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// SvelteKit registers this file automatically in production builds, so nothing
// in the app calls navigator.serviceWorker itself.
//
// Only the shell is cached. Entries, tags and videos live in OPFS, not over
// HTTP, so once the shell is served offline the app is fully usable.

import { build, files, version } from '$service-worker'

const sw = self as unknown as ServiceWorkerGlobalScope

const CACHE = `lindyhop-${version}`

// adapter-static's SPA fallback document is not part of `build` or `files`, so
// it is fetched by URL and cached under '/' — every route offline resolves to it.
const FALLBACK = '/'
const PRECACHE = [...build, ...files, FALLBACK]

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => sw.skipWaiting())
  )
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => sw.clients.claim())
  )
})

sw.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  event.respondWith(respond(request, url))
})

async function respond(request: Request, url: URL): Promise<Response> {
  const cache = await caches.open(CACHE)

  const precached = await cache.match(url.pathname)
  if (precached) return precached

  if (request.mode === 'navigate') {
    const fallback = await cache.match(FALLBACK)
    if (fallback) return fallback
  }

  return fetch(request)
}
