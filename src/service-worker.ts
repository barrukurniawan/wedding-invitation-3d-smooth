/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope

import { build, files, version } from '$service-worker'

// Create a unique cache name for this deployment
const CACHE = `wedding-cache-${version}`

// Tidak ada precache massal: dulu daftar ini memuat hampir semua file statis (±57 MB,
// termasuk aset preset 2D dan lagu) sehingga setiap pengunjung baru mengunduhnya di latar
// belakang dan memperlambat undangan. Sekarang file hanya disimpan saat benar-benar diminta.
const PRECACHE_ASSETS: string[] = []
void build
void files

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

    // CDN aset (jsDelivr, URL dikunci per versi): cache-first.
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/marryme-assets@')) {
      const cached = await cache.match(event.request)
      if (cached) return cached
      const response = await fetch(event.request)
      if (response.ok) cache.put(event.request, response.clone())
      return response
    }

    // Build ber-hash, aset taman 2D (+ file preset bertanda ?v=), model 3D, audio, media:
    // cache-on-demand (cache-first). Cache dibuang otomatis tiap deploy (nama cache = versi build).
    if (
      url.pathname.startsWith('/_app/immutable/') ||
      url.pathname.startsWith('/presets/garden-2d/assets/') ||
      (url.pathname.startsWith('/presets/garden-2d/') && url.search.includes('v=')) ||
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
