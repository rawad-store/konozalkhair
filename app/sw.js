/* Service Worker - كنوز الخير */
const CACHE_NAME = 'konoz-v8'; // إصدار جديد

const CORE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './cases.json',
  './hero-bg.jpg',
  './preview.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // إذا كان الطلب لملف cases.json، اجلبه من الشبكة دائماً وتخطى الكاش
  if (url.pathname.endsWith('cases.json')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // استراتيجية Network First لباقي الملفات
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
  );
});
