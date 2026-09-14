/* NexusAI — Service Worker (offline-first cache) */
const CACHE = "nexus-ai-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles/main.css",
  "./scripts/app.js",
  "./scripts/views.js",
  "./scripts/charts.js",
  "./scripts/api.js",
  "./scripts/chat.js",
  "./manifest.webmanifest",
  "./assets/favicon.svg",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Cache-first, falling back to network, then updating cache. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
