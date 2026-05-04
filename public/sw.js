const CACHE_NAME = 'maiplay-v2'

const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS).catch(() => Promise.resolve())
    })
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Never cache Supabase/API/auth calls
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/functions/')
  ) {
    return
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || !networkResponse.ok) return networkResponse

          const responseClone = networkResponse.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })

          return networkResponse
        })
      })
    )

    return
  }

  // For app pages, always try network first so updates show immediately
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/'))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    }).then(() => self.clients.claim())
  )
})