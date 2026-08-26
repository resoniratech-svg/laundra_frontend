// Laundra POS Service Worker (Offline-First Cache Engine)
const CACHE_NAME = 'laundra-pos-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/qubexe.logo.png',
  '/icons.svg'
];

// 1. Install: Precache shell assets & skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Laundra SW] Precaching app shell assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Laundra SW] Precache partial error (ignored):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean up older cache versions & claim all open tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Laundra SW] Deleting obsolete cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Smart Stale-While-Revalidate & Offline Navigation Fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests (e.g. POST, PUT, DELETE go directly to network or offline queue)
  if (event.request.method !== 'GET') {
    return;
  }

  // Bypass API requests to let network handle them or fail gracefully for OfflineQueue
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // A. Navigation requests (e.g. user opens /admin or /pos while offline) -> serve cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html').then((cachedIndex) => {
            return cachedIndex || caches.match('/');
          });
        })
    );
    return;
  }

  // B. Static Assets (JS, CSS, Images, Fonts): Cache-First / Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch((err) => {
          // If offline and no cache match, return null
          return null;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
