// Offline support. The board itself (index.html, with this week's predictions inside it) comes from
// the network whenever it answers quickly, so a refresh shows the latest numbers; with no signal the
// last copy opens from cache. Google Fonts are cached on first use.
const VERSION = 'lineboard-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/favicon.svg', './icons/icon-192.png'];
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function networkFirst(req) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 4000));
  const net = fetch(req, { cache: 'no-store' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  });
  net.catch(() => {});
  return Promise.race([net, timeout]).catch(() =>
    caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : net)));
}
function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }));
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(req));
  else if (CDN_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(req));
});
