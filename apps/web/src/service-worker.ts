/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// SvelteKit registers this file automatically in production builds, so nothing
// in the app calls navigator.serviceWorker itself.
//
// Only the hashed, immutable build assets are cached. Documents and /api/ go
// straight to the network every time: entries now live on the server behind a
// session, so a cached page would be one user's view served to the next, and a
// cached shell would hide the redirect to /login.

import { build, files, version } from '$service-worker'

const sw = self as unknown as ServiceWorkerGlobalScope

const CACHE = `lindyhop-${version}`
const PRECACHE = [...build, ...files]
const CACHEABLE = new Set(PRECACHE)

// Shown when a navigation cannot reach the server. It lives in `static/`, so it
// is already part of `files` and gets precached with everything else.
const OFFLINE = '/offline.html'

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

  // Every asset here is content-hashed or a static file, so a hit is always
  // correct and never needs revalidating.
  if (CACHEABLE.has(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) => cache.match(url.pathname).then((hit) => hit ?? fetch(request)))
    )
    return
  }

  // Documents still always go to the network — caching an authenticated page
  // would leak it to the next user and hide the redirect to /login. The only
  // thing added here is a fallback for when the network is not there at all.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.open(CACHE).then((cache) => cache.match(OFFLINE))
        return cached ?? Response.error()
      })
    )
  }
})
