/* Service Worker - كنوز الخير (آخر تحديث أولوية) */
const CACHE_NAME = 'konoz-v6'; // تم تغيير الإصدار لإجبار المتصفح على التحديث

const CORE_ASSETS = [
  './',
  './index.html',
  './admin.html', // إضافة لوحة التحكم
  './manifest.json',
  './cases.json',
  './hero-bg.jpg',
  './preview.jpg'
];

// ===== التثبيت =====
self.addEventListener('install', (event) => {
  self.skipWaiting(); // تفعيل فوري
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
    ).then(() => self.clients.claim())
  );
});

// ===== الجلب: Network First للصفحة الرئيسية وملفات البيانات =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  
  // لا نتدخل في طلبات المواقع الخارجية (مثل الخطوط أو الصور من خارج الموقع)
  if (url.origin !== location.origin) return;

  // استراتيجية (الشبكة أولاً) للملفات الأساسية والبيانات
  const isAppFile =
    req.mode === 'navigate' ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('admin.html') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('sw.js') ||
    url.pathname.endsWith('cases.json');

  if (isAppFile) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          // إذا نجح الاتصال، احفظ النسخة الجديدة وأرجعها
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          // إذا انقطع الإنترنت، استخدم النسخة المخزنة
          return caches.match(req).then((cached) => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // استراتيجية (Cache First) لباقي الملفات (صور، إلخ)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// استقبال رسالة لتفعيل التحديث فوراً
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
