const CACHE_NAME = 'radio-cafe-v1'
const STATIC_CACHE = 'radio-cafe-static-v1'

const STATIC_ASSETS = [
  '/',
  '/auth/login',
  '/cafe/player',
  '/admin/playlist'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE
          })
          .map((cacheName) => {
            return caches.delete(cacheName)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle audio files specially
  if (request.url.includes('/storage/v1/object/public/tracks/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) {
            return cached
          }
          
          // If not in cache, fetch and cache it
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone())
            }
            return response
          }).catch(() => {
            // Return a placeholder or error response when offline
            return new Response('Audio unavailable offline', { 
              status: 503,
              statusText: 'Service Unavailable' 
            })
          })
        })
      })
    )
    return
  }

  // Handle other requests with network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone()
        
        // Cache successful responses
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
        }
        
        return response
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(request).then((cached) => {
          if (cached) {
            return cached
          }
          
          // For navigation requests, serve the offline page
          if (request.mode === 'navigate') {
            return caches.match('/offline.html') || 
                   new Response('Offline', { status: 503 })
          }
          
          return new Response('Resource unavailable offline', { 
            status: 503 
          })
        })
      })
  )
})