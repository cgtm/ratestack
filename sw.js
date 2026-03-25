/**
 * Service worker: precaches shell assets; network-first for FX API with cache only on success
 * (avoids persisting 4xx/5xx bodies). Offline API requests fall back to last good response.
 * Bump `CACHE_NAME` when shipping so clients drop old bundles (paired with CI stamping this file).
 */
const CACHE_NAME = "ratestack-69be7c4";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./src/app.js",
  "./src/api.js",
  "./src/state.js",
  "./src/currencies.js",
  "./src/pointer.js",
  "./src/converter.js",
  "./src/drag.js",
  "./src/swipe.js",
  "./src/haptics.js",
  "./src/settings.js",
  "./src/theme.js",
  "./src/i18n.js",
  "./src/i18n/en.js",
  "./src/i18n/zh.js",
  "./src/i18n/hi.js",
  "./src/i18n/es.js",
  "./src/i18n/ko.js",
  "./src/i18n/ja.js",
  "./assets/logo-alt-icon-favicon.ico",
  "./assets/logo-alt-icon-favicon-32.png",
  "./assets/logo-alt-icon.svg",
  "./assets/logo-alt-icon-192.png",
  "./assets/logo-alt-icon-512.png",
  "./assets/logo-alt-icon-apple-touch.png",
  "./assets/ui/card-icons.js",
  "./assets/ui/chevron.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (url.origin === "https://open.er-api.com") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
