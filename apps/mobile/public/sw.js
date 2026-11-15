/* FlameAtlas phoneSpaceApp service worker: an offline-first app shell.
 * The app shell and bundled dataset are precached on install; navigations fall back to the cached
 * shell when the network is unavailable, so the whole evidence browser works on a plane. Bump
 * CACHE when assets change. Only same-origin GETs are cached; API calls are never cached here. */
const CACHE = "flameatlas-shell-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/icon-maskable.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // Navigations: network first, fall back to the cached shell (offline).
  if (request.mode === "navigate") {
    e.respondWith(fetch(request).catch(() => caches.match("/index.html").then((r) => r || caches.match("/"))));
    return;
  }
  // Static assets: cache first, then network, filling the cache as we go (stale-while-revalidate-ish).
  e.respondWith(
    caches.match(request).then((hit) => {
      const net = fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
