// PharmPulse PWA Service Worker for PWABuilder 100/100 Offline Readiness
const CACHE_NAME = 'pharmpulse-pos-v3.0';
const OFFLINE_URL = '/index.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Helper: check if a request is a dev, Vite, or API request that must never be cached
function isDevOrInternalRequest(urlStr) {
  try {
    const url = new URL(urlStr);
    return (
      url.pathname.startsWith('/src') ||
      url.pathname.startsWith('/node_modules') ||
      url.pathname.startsWith('/@') ||
      url.pathname.startsWith('/api') ||
      url.search.includes('v=') ||
      url.search.includes('t=') ||
      url.hostname === 'localhost' ||
      url.hostname.includes('.run.app') ||
      url.hostname.includes('webcontainer')
    );
  } catch (e) {
    return false;
  }
}

// 1. Install: Clean install & skip waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[PharmPulse SW] Asset pre-cache non-blocking notice:', err);
        });
      })
  );
});

// 2. Activate: Clean outdated caches & take control of open tabs immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[PharmPulse SW] Purging legacy cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch: Offline-first with strict dev/API bypass
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET and non-HTTP(S) requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Bypass all dev scripts, Vite internal modules, API routes, and cloud-run preview
  if (isDevOrInternalRequest(request.url)) {
    return;
  }

  // A. Navigation requests (SPA page loads): Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match(OFFLINE_URL);
          if (fallback) return fallback;
          return new Response(
            '<!DOCTYPE html><html><head><title>PharmPulse Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;background:#0f172a;color:#fff;text-align:center;padding:40px;"><h2>PharmPulse POS Offline</h2><p>Please check your network connection to sync transactions.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // B. Static Assets in standalone production only
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response('Resource offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
