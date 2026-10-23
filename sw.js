// Stock Tracker offline cache: lets the app open with no signal after the first visit.
// Bump VERSION whenever you upload a new index.html so phones pick up the change.
const VERSION = "techstock-v26";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];
// Only these outside sites are cached (libraries and fonts). Google sign-in and Google Sheets
// requests always go to the network so the app never sees stale data.
const CACHE_HOSTS = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // The page itself: try the network first so updates arrive, fall back to the saved copy offline.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put("./index.html", c)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !CACHE_HOSTS.includes(url.hostname)) return; // Google APIs etc: straight to the network
  // App files, libraries and fonts: use the saved copy, fetch and keep it if missing.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); }
    return r;
  })));
});
