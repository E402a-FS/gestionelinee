// Service worker unico della suite Gestione Linee (Turni + Tratte).
// Quando pubblichi una nuova versione, aumenta il numero qui sotto (suite-v2, suite-v3, ...).
const VERSION = "suite-v2";
const FILES = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/tratte/",
  "/tratte/index.html",
  "/tratte/firebase-config.js"
];
const SDK_CACHE = "firebase-sdk-10.12.2";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== SDK_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Librerie Firebase (versione fissa) usate dalle Tratte: copia salvata, così parte anche offline.
  if (url.origin === "https://www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(SDK_CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // Script Google dei turni, login Google, database, Telegram: sempre in rete.
  if (url.origin !== self.location.origin) return;

  // File dell'app: prima la rete (aggiornamenti subito visibili), copia salvata se offline.
  const paginaRiserva = url.pathname.startsWith("/tratte") ? "/tratte/index.html" : "/index.html";
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match(paginaRiserva)))
  );
});
