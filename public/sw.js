
const CACHE_NAME = 'ascendia-cache-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = [
  '/',
  OFFLINE_URL
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page and core assets.');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker.
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients.
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          // Check if we received a valid response
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          console.log('[ServiceWorker] Fetch failed; returning offline page instead.', error);
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  } else if (PRECACHE_ASSETS.includes(event.request.url) || event.request.destination === 'style' || event.request.destination === 'script' || event.request.destination === 'font') {
    // Cache-First strategy for static assets (CSS, JS, Fonts) and precached items
     event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        }).catch(async (error) => {
            console.log('[ServiceWorker] Fetch failed for static asset; potentially offline.', event.request.url, error);
            // For images or other non-critical assets, you might not want to return offline.html
            // but for scripts/styles, it's part of the core shell.
            if (event.request.destination === 'script' || event.request.destination === 'style') {
                 const cache = await caches.open(CACHE_NAME);
                 return cache.match(OFFLINE_URL);
            }
            // return new Response(null, { status: 404 }); // Or some other generic fallback
        });
      })
    );
  }
});
