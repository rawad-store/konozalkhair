/* Service Worker - كنوز الخير (تحديث تلقائي ذكي) */
const CACHE_NAME = 'konoz-update-v12'; // تم تغيير الإصدار لإجبار المتصفح على التحديث

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './cases.json',
  './hero-bg.jpg'
];

// التثبيت: حفظ الملفات الأساسية
self.addEventListener('install', (event) => {
  self.skipWaiting(); // تفعيل فوري
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

// التفعيل: حذف الكاش القديم والسيطرة على الصفحات
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// الجلب: استراتيجية (الشبكة أولاً) لضمان آخر تحديث
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // لا نتدخل في طلبات المواقع الخارجية (مثل الخطوط أو الفيسبوك)
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // إذا نجح الاتصال بالإنترنت، احفظ النسخة الجديدة وأرجعها
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // إذا انقطع الإنترنت، استخدم النسخة المحفوظة
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // إذا كانت الصفحة الرئيسية غير محفوظة، أرجع index.html
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
      })
  );
});

// استقبال رسالة تفعيل التحديث
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
