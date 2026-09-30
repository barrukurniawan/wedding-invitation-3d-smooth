/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope

import { build, files, version } from '$service-worker'

// Create a unique cache name for this deployment
const CACHE = `wedding-cache-${version}`

// Critical assets to pre-cache immediately (core JS/CSS, favicon)
// Exclude heavy audio (27MB), video (7MB), documentation, and 3D models from initial batch
const PRECACHE_ASSETS = [
  ...build,
  ...files.filter(
    (file) =>
      !file.startsWith('/audio/') &&
      !file.startsWith('/media/') &&
      !file.startsWith('/documentation/') &&
      !file.endsWith('.glb') &&
      !file.endsWith('.gltf') &&
      !file.endsWith('.bin')
  ),
]

self.addEventListener('install', (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE)
    await cache.addAll(PRECACHE_ASSETS)
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

  const url = new URL(event.request.url)

  // Never intercept API requests - let them pass straight to network
  if (url.pathname.startsWith('/api/')) return

  async function respond() {
    const cache = await caches.open(CACHE)

    // Serve pre-cached core assets directly from cache (cache-first)
    if (PRECACHE_ASSETS.includes(url.pathname)) {
      const cachedResponse = await cache.match(event.request)
      if (cachedResponse) {
        return cachedResponse
      }
    }

    // Static assets (3D models, audio, images): cache-on-demand
    if (
      url.pathname.startsWith('/models/') ||
      url.pathname.startsWith('/nature/') ||
      url.pathname.startsWith('/audio/') ||
      url.pathname.startsWith('/media/')
    ) {
      const cachedResponse = await cache.match(event.request)
      if (cachedResponse) {
        return cachedResponse
      }

      try {
        const response = await fetch(event.request)
        if (response.status === 200) {
          cache.put(event.request, response.clone())
        }
        return response
      } catch {
        throw new Error('Offline')
      }
    }

    // For HTML and other routes: network first, then fall back to cache
    try {
      const response = await fetch(event.request)
      if (response.status === 200) {
        cache.put(event.request, response.clone())
      }
      return response
    } catch {
      const cachedResponse = await cache.match(event.request)
      if (cachedResponse) {
        return cachedResponse
      }
      throw new Error('Offline')
    }
  }

  event.respondWith(respond())
})
