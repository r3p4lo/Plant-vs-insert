/* Garden Guardians — Service Worker (offline + installable PWA) */
const CACHE = "gg-cache-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest"]).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first, cache-fallback: selalu versi terbaru saat online, tetap bisa main offline
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const hit = await cache.match(req, { ignoreSearch: true });
        return hit || cache.match("./index.html") || Response.error();
      }
    })
  );
});
