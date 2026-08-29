/* うんこクエスト Service Worker  v3
   ・HTML と JSON は「ネットワークさきに みる」＝更新が すぐ反映される
   ・画像などは キャッシュさきに みる＝はやい
   ・オフラインでも あそべる                                        */
const CACHE = 'unkoq-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function putCache(req, res) {
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // HTML と manifest は ネットワーク優先（更新がすぐ反映される）
  const isDoc = req.mode === 'navigate'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.json');

  if (sameOrigin && isDoc) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => putCache(req, res))
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // それ以外（画像・フォント）は キャッシュ優先
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => putCache(req, res)))
      .catch(() => caches.match('./index.html'))
  );
});
