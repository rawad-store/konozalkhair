/* Service Worker قوي - مؤسسة كنوز الخير */
const CACHE_NAME = 'konoz-offline-v5';

// الملفات الأساسية التي تُحفظ فور التثبيت
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// ===== التثبيت =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => self.skipWaiting()) // تفعيل فوري
  );
});

// ===== التفعيل وتنظيف الكاش القديم =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== استراتيجية: Cache First مع تحديث في الخلفية =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // نتجاهل الطلبات غير GET
  if (req.method !== 'GET') return;

  // نتجاهل طلبات الامتدادات والتحليلات
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      // إذا وُجد في الكاش → نرجعه فورًا
      if (cachedResponse) {
        // نحاول التحديث في الخلفية (Stale-While-Revalidate)
        event.waitUntil(
          fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              return caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, networkResponse.clone());
              });
            }
          }).catch(() => {}) // تجاهل أخطاء الشبكة في الخلفية
        );
        return cachedResponse;
      }

      // إذا لم يوجد في الكاش → نحاول الشبكة
      return fetch(req)
        .then((networkResponse) => {
          // نحفظ النسخة الجديدة
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // فشل الشبكة → نرجع الصفحة الرئيسية كبديل
          if (req.mode === 'navigate' || req.destination === 'document') {
            return caches.match('./index.html');
          }
          // لباقي الملفات نرجع استجابة فارغة لتجنب الأخطاء
          return new Response('', {
            status: 503,
            statusText: 'Offline'
          });
        });
    })
  );
});

// استقبال رسائل من الصفحة (للتحديث اليدوي)
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
