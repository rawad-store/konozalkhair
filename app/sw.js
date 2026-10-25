/* Service Worker - كنوز الخير */
const CACHE_NAME = 'konoz-v38';
const CORE_ASSETS = ['./', './index.html', './survey.html', './manifest.json', './cases.json', './hero-bg.jpg', './preview.jpg', './app-icon.jpg'];
const NETWORK_ONLY_FIRST = ['cases.json', 'admin.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // لا يفشل التثبيت إذا غاب ملف واحد
      Promise.all(CORE_ASSETS.map((a) =>
        fetch(a, { cache: 'no-store' })
          .then((r) => (r.ok && r.type === 'basic' ? cache.put(stripQuery({ url: new URL(a, self.location.href).href }), r) : null))
          .catch(() => null)
      ))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function stripQuery(req) {
  const u = new URL(req.url);
  u.search = '';
  return u.href;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const key = stripQuery(req); // يتجاهل ?t=... حتى لا يتضخم الكاش ويعمل الأوفلاين
  const fresh = NETWORK_ONLY_FIRST.some((n) => url.pathname.endsWith(n));

  event.respondWith(
    fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }) // دائمًا من الشبكة، تجاوزًا لكاش المتصفح وGitHub
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(key, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(key).then((hit) => {
          if (hit) return hit;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        })
      )
  );
});
