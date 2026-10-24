/* Service Worker - كنوز الخير (تخطي الكاش) */
const CACHE_NAME = 'konoz-v9'; // تم تغيير الإصدار

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

  // إذا كان الطلب لملف الحالات أو لوحة التحكم، اجلبه من الشبكة دائماً
  if (url.pathname.endsWith('cases.json') || url.pathname.endsWith('admin.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }) // تخطي الكاش تماماً
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req)) // في حال انقطاع الإنترنت
    );
    return;
  }

  // استراتيجية Network First للصفحة الرئيسية
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
