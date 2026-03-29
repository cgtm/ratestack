/**
 * Service worker: precaches shell assets; network-first for FX API with cache only on success
 * (avoids persisting 4xx/5xx bodies). Offline API requests fall back to last good response.
 * Bump `CACHE_NAME` when shipping so clients drop old bundles (paired with CI stamping this file).
 *
 * `STATIC_ASSETS` is generated — do not edit the array by hand. Run:
 *   node scripts/generate-sw.mjs
 */
const CACHE_NAME = "ratestack-2c285da";
const STATIC_ASSETS = [
  "./",
  "./assets/apple-touch-icon.png",
  "./assets/favicon-32.png",
  "./assets/favicon.ico",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon.svg",
  "./assets/ui/icons.js",
  "./index.html",
  "./manifest.json",
  "./src/actions.js",
  "./src/app.js",
  "./src/currencies.js",
  "./src/data/numbers.js",
  "./src/data/rates.js",
  "./src/data/store.js",
  "./src/gestures/drag.js",
  "./src/gestures/pointer.js",
  "./src/gestures/swipe.js",
  "./src/haptics.js",
  "./src/i18n.js",
  "./src/i18n/en.js",
  "./src/i18n/es.js",
  "./src/i18n/hi.js",
  "./src/i18n/ja.js",
  "./src/i18n/ko.js",
  "./src/i18n/zh.js",
  "./src/theme.js",
  "./src/ui/cards.js",
  "./src/ui/converter.js",
  "./src/ui/currency-list.js",
  "./src/ui/dropdowns.js",
  "./src/ui/settings.js",
  "./src/ui/shell.js",
  "./src/ui/status.js",
  "./style.css"
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
