/* Service Worker - كنوز الخير */
const CACHE_NAME = 'konoz-v44';
const CORE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './survey.html',
  './manifest.json',
  './cases.json',
  './hero-bg.jpg',
  './preview.jpg',
  './app-icon.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(CORE_ASSETS.map((a) =>
        fetch(a, { cache: 'no-store' })
          .then((r) => (r.ok && r.type === 'basic' ? cache.put(stripQuery(new URL(a, self.location.href).href), r) : null))
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

function stripQuery(input) {
  if (!input) return '';
  var url = typeof input === 'string' ? input : (input.url ? input.url : String(input));
  if (!url) return '';
  var u = new URL(url, self.location.href);
  u.search = '';
  return u.href;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const key = stripQuery(req);
  if (!key) return;

  event.respondWith(
    fetch(req.url, { cache: 'no-store', credentials: 'same-origin' })
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
