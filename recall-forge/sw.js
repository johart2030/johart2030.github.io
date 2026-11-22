// RecallForge service worker: lets the app open offline.
// Your own files: network first, cached copy as fallback.
// Firebase SDK and fonts: cached after first load.
const CACHE = "rf-v3";
const CDN = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("rf-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  ),
);

self.addEventListener("fetch", (e) => {
  const r = e.request;
  const u = new URL(r.url);
  const own = u.host === location.host;

  if (r.method !== "GET" || !(own || CDN.includes(u.host))) return;

  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(r);
      if (!own && hit) return hit;

      try {
        const res = await fetch(r);
        if (res.ok || res.type === "opaque") c.put(r, res.clone());
        return res;
      } catch (err) {
        return hit || (await c.match(new URL("index.html", location))) || Response.error();
      }
    }),
  );
});
