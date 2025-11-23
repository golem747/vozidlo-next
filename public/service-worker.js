const CACHE_NAME = "jazdy-cache-v1";
const URLS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Inštalácia SW – prvé nahratie cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Aktivácia – zmazanie starých verzií cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  clients.claim();
});

// Fetch – jednoduchý offline režim (cache-first)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).catch(() => {
        // ak nevieme fetchnúť a nie je cache, skúsim aspoň / (hlavnú stránku)
        return caches.match("/");
      });
    })
  );
});
