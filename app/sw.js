/* Service Worker - كنوز الخير (حل نهائي لمشكلة التحديث) */
const CACHE_NAME = 'konoz-v10'; // تم تغيير الإصدار لإجبار الهواتف على مسح الكاش القديم

const CORE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './cases.json',
  './hero-bg.jpg',
  './preview.jpg'
];

// ===== التثبيت =====
self.addEventListener('install', (event) => {
  self.skipWaiting(); // تفعيل النسخة الجديدة فوراً
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

// ===== التفعيل =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // السيطرة على كل الصفحات المفتوحة
  );
});

// ===== الجلب (أهم جزء) =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  
  // تجاهل الطلبات الخارجية (مثل جوجل فونتس)
  if (url.origin !== location.origin) return;

  // 1. إذا كان الطلب لملف الحالات (cases.json)، اجلبه من الإنترنت دائماً (Network Only)
  if (url.pathname.endsWith('cases.json')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }) // تخطي الكاش تماماً
        .then((res) => {
          // تحديث الكاش بالنسخة الجديدة (كاحتياطي إذا انقطع النت)
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req)) // في حال انقطاع الإنترنت، استخدم النسخة المخزنة
    );
    return;
  }

  // 2. لباقي الملفات، استخدم استراتيجية (الشبكة أولاً)
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
