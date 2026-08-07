const CACHE = 'italy-2026-app-v3';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './navigation-state.js',
  './history-aware-back.js',
  './today-polish.js',
  './wallet-polish.js',
  './trip-data.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // External requests such as weather, exchange rates and Maps should stay
  // network-driven instead of filling the app cache with transient responses.
  if (url.origin !== self.location.origin) return;

  // For page navigation, prefer the freshest deployed HTML when online and
  // fall back to the cached app shell when the connection is unavailable.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE);
          cache.put('./index.html', response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) ||
          (await caches.match('./index.html')) ||
          (await caches.match('./'));
      }
    })());
    return;
  }

  // Same-origin app assets use stale-while-revalidate: cached files appear
  // immediately offline/online while a fresh copy is stored for the next load.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(network);
      return cached;
    }

    const response = await network;
    return response || Response.error();
  })());
});
