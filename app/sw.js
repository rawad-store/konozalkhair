/* Service Worker - كنوز الخير */
var VERSION = 'konoz-v14';
var CORE = './';
var SHELL = ['./', './index.html', './manifest.json', './cases.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './hero-bg.jpg', './preview.jpg'];
var FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return fetch(u, { cache: 'no-store' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {});
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });

function put(key, res) {
  if (res && res.status === 200) { var cl = res.clone(); caches.open(VERSION).then(function (c) { c.put(key, cl); }); }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // الخطوط: من الكاش أولًا ثم تحديث في الخلفية
  if (FONT_HOSTS.indexOf(url.hostname) > -1) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) { return put(req, r); }).catch(function () { return hit; });
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // الحالات: الشبكة دائمًا، وعند الانقطاع آخر نسخة محفوظة
  if (url.pathname.slice(-10) === 'cases.json') {
    e.respondWith(fetch(req.url.split('?')[0] + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return put('./cases.json', r); })
      .catch(function () { return caches.match('./cases.json').then(function (h) { return h || new Response('[]', { headers: { 'Content-Type': 'application/json' } }); }); }));
    return;
  }

  // التنقل بين الصفحات: الشبكة أولًا ثم الصفحة المحفوظة
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) { return put(req, r); })
      .catch(function () { return caches.match(req, { ignoreSearch: true }).then(function (h) { return h || caches.match('./index.html').then(function (i) { return i || caches.match(CORE); }); }); }));
    return;
  }

  // باقي الملفات: الشبكة أولًا
  e.respondWith(fetch(req).then(function (r) { return put(req, r); })
    .catch(function () { return caches.match(req, { ignoreSearch: true }); }));
});
