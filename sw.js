const CACHE_NAME = 'ratestack-v19';
const STATIC_ASSETS = [
  './', './index.html', './style.css', './manifest.json',
  './src/app.js', './src/api.js', './src/state.js', './src/currencies.js',
  './src/converter.js', './src/drag.js', './src/swipe.js', './src/settings.js', './src/theme.js',
  './src/i18n.js', './src/i18n/en.js', './src/i18n/zh.js', './src/i18n/hi.js', './src/i18n/es.js', './src/i18n/ko.js',
  './assets/favicon.ico', './assets/favicon-32.png', './assets/icon.svg',
  './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (url.origin === 'https://open.er-api.com') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || Response.error()))
    );
    return;
  }

  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
