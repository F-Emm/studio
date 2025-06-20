// Incrementing CACHE_NAME version
const CACHE_NAME = 'ascendia-cache-v2';
const OFFLINE_URL = 'offline.html';

// Add manifest.json and logo.png to the list of files to cache
const CACHE_FILES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/logo.png'
  // Add other critical shell assets if needed.
  // For Next.js with App Router, many assets are hashed,
  // so runtime caching handles them well.
  // These are core, unhashed assets we want to ensure are fresh.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page and core assets');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
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
    })
    .then(() => {
        // Tell the active service worker to take control of the page immediately.
        return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          console.log('[ServiceWorker] Fetch failed; returning offline page instead.', error);

          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  } else if (CACHE_FILES.includes(new URL(event.request.url).pathname) || event.request.url.startsWith(self.location.origin)) {
    // Serve from cache first for other assets (like CSS, JS, images defined in CACHE_FILES or same-origin)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Optionally, cache new resources dynamically
          // Be careful with caching too much dynamically, especially with hashed assets.
          // if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          //   const cache = await caches.open(CACHE_NAME);
          //   cache.put(event.request, networkResponse.clone());
          // }
          return networkResponse;
        }).catch(() => {
          // If fetch fails and it's an image, you might want a placeholder
          // For now, just let it fail if not in cache
        });
      })
    );
  }
});
