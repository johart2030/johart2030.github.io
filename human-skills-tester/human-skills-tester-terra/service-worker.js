const CACHE = 'hst-terra-v8';

const CORE = [
  './',
  './index.html',
  './pi-memory.html',
  './number-memory.html',
  './typing.html',
  './admin.html',
  './css/style.css',
  './js/common.js',
  './js/pi-memory.js',
  './js/typing.js',
  './js/game-integrity.js',
  './js/admin.js',
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)
        .then(response => response || caches.match('./offline.html')))
  );
});
