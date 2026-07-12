/* 칠문 PWA 서비스워커 — 앱 셸 오프라인 캐시 */
const CACHE = 'chilmun-v1';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './css/style.css',
  './js/data.js',
  './js/engine.js',
  './js/content-db.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 앱 셸: 캐시 우선(오프라인 지원). 그 외(원격 DB 등): 네트워크 우선.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin) {
    e.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
  } else {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});
