// Offline support. The app opens instantly from its saved copy and refreshes that copy in the
// background. Fresh predictions don't depend on this file: the page itself checks data.json through
// the GitHub API every time it is opened. Google Fonts are cached on first use.
const VERSION = 'lineboard-v3';
const SHELL = ['./', './index.html', './value.html', './manifest.webmanifest', './icons/favicon.svg', './icons/icon-192.png'];
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Serve the saved copy straight away and update it from the network for next time.
function staleWhileRevalidate(req) {
  // Opening the board (/, /index.html, or any unknown path) uses the board's saved copy; other pages
  // such as value.html (the odds check) keep their own copy.
  const page = new URL(req.url).pathname.split('/').pop();
  const key = req.mode !== 'navigate' ? req : (page && page.endsWith('.html') && page !== 'index.html' ? './' + page : './index.html');
  const net = fetch(req, { cache: 'no-store' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
    return res;
  });
  return caches.match(key, { ignoreSearch: true }).then(hit => {
    if (hit) { net.catch(() => {}); return hit; }
    return net;
  });
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
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/data.json')) return;          // always straight from the network
    e.respondWith(staleWhileRevalidate(req));
  } else if (CDN_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(req));
});
