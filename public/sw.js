/* Döküm Takip — Service Worker
 * Strateji:
 *  - Sayfa gezinmeleri: network-first, çevrimdışıysa cache
 *  - /_next/static ve ikonlar: cache-first (içerik hash'li, güvenli)
 *  - /api istekleri: her zaman network (offline senkronizasyonu uygulama katmanı yönetir)
 */
const CACHE_VERSION = 'dokum-takip-v1';
const APP_SHELL = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Yalnızca kendi origin'imiz ve GET istekleri
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API: her zaman ağ (offline-first mantığı uygulamada, localStorage ile)
  if (url.pathname.startsWith('/api/')) return;

  // Statik varlıklar: cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Sayfa gezinmeleri: network-first, düşerse cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
  }
});
