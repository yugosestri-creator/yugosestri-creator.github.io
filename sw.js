/* Service worker: fa aprire Yugo velocemente e anche con poca connessione */
const CACHE = "yugo-v10";
const FILES = ["./", "./index.html", "./style.css", "./app.js", "./anim.js", "./config.js", "./i18n.js", "./manifest.json", "./icon-192.png", "./apple-touch-icon.png", "./logo-word.webp", "./piatto.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Prima prova la rete (così vedi sempre le modifiche), se manca usa la copia salvata */
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
