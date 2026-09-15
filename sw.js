/* NexusAI — Service Worker (network-first, s offline fallbackom) */
const CACHE = "nexus-ai-v6";

/* Dopusti stranici da natjera novu verziju da odmah preuzme kontrolu. */
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
const ASSETS = [
  "./",
  "./index.html",
  "./styles/main.css",
  "./scripts/app.js",
  "./scripts/views.js",
  "./scripts/charts.js",
  "./scripts/api.js",
  "./scripts/chat.js",
  "./scripts/kanban.js",
  "./scripts/livechart.js",
  "./manifest.webmanifest",
  "./assets/favicon.svg",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network-first: uvijek pokušaj dohvatiti svježu verziju s mreže i
   ažuriraj cache. Cache se koristi samo kao fallback kad si offline.
   Time se izbjegava "zaglavljena" stara verzija PWA-a. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Vanjske API pozive (kripto/vrijeme/tečaj) ne diramo — idu direktno na mrežu.
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("./index.html")))
  );
});
