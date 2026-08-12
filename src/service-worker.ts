/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope

import { build, files, version } from '$service-worker'

// Create a unique cache name for this deployment
const CACHE = `wedding-cache-${version}`

const ASSETS = [
  ...build, // the app itself (js, css)
  ...files  // everything in `static` (glb, png, etc)
]

self.addEventListener('install', (event) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE)
    await cache.addAll(ASSETS)
  }

  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
  event.waitUntil(addFilesToCache())
})

self.addEventListener('activate', (event) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key)
    }
  }

  // Tell the active service worker to take control of the page immediately
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') return

  async function respond() {
    const url = new URL(event.request.url)
    const cache = await caches.open(CACHE)

    // Serve pre-cached assets directly from the cache
    if (ASSETS.includes(url.pathname)) {
      const cachedResponse = await cache.match(event.request)
      if (cachedResponse) {
        return cachedResponse
      }
    }

    // For everything else, try the network first, then fall back to cache
    try {
      const response = await fetch(event.request)
      // If we got a valid response, cache it for future use
      if (response.status === 200) {
        cache.put(event.request, response.clone())
      }
      return response
    } catch {
      // If network fails (offline), try to serve from cache
      const cachedResponse = await cache.match(event.request)
      if (cachedResponse) {
        return cachedResponse
      }
      throw new Error('Offline')
    }
  }

  event.respondWith(respond())
})
