/**
 * Service worker: precaches shell assets; network-first for FX API with cache only on success
 * (avoids persisting 4xx/5xx bodies). Offline API requests fall back to last good response.
 * Bump `CACHE_NAME` when shipping so clients drop old bundles (paired with CI stamping this file).
 *
 * `STATIC_ASSETS` is generated — do not edit the array by hand. Run:
 *   node scripts/generate-sw.mjs
 */
const CACHE_NAME = "ratestack-v39";
const STATIC_ASSETS = __STATIC_ASSETS__;

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
