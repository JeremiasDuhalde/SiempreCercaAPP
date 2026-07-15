// Service Worker — SiempreCerca PWA
const CACHE_NAME = "siemprecerca-v1";

// Precache solo lo esencial
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Network first, fallback to cache (para que siempre tenga datos frescos)
self.addEventListener("fetch", (event) => {
  // No cachear requests de API ni WebSocket
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("/ws")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear assets estáticos
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
