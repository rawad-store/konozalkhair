/* Service Worker - كنوز الخير */
const CACHE_NAME = 'konoz-v21';

const CORE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './hero-bg.jpg',
  './preview.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        CORE_ASSETS.map(url => fetch(url, {cache: 'no-store'}).then(r => {
            if(r.ok) cache.put(url, r);
        }).catch(() => {}))
      );
    })
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

  // 🔴 تخطي الكاش للحالات ولوحة التحكم
  if (url.pathname.endsWith('cases.json') || url.pathname.endsWith('admin.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store', credentials: 'same-origin' })
        .catch(() => caches.match('./cases.json'))
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
