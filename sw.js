/* Drive Play service worker: the pages open even with a weak or no connection, and catalog files
   are kept by version. Videos, YouTube and TMDB always come from the network. */
const V = 'dp-v5-202611231128';
const SHELL = ['/', '/watch/', '/cineai/', '/hub/', '/news/', '/legal/', '/app/', '/tv/', '/offline.html', '/icons/favicon.svg', '/icons/icon-192.png', '/manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('dp-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith('/') || /^\/(drive-play-account|Drive-Play|sites)\//.test(u.pathname)) return;
  /* catalog files: a versioned address never changes, so the saved copy is used; meta always from the network */
  if (u.pathname.startsWith('/data/')) {
    if (u.pathname.endsWith('/meta.json')) { e.respondWith(fetch(r).catch(() => caches.match(r, { ignoreSearch: true }))); return; }
    e.respondWith(caches.open(V + '-data').then(async c => { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; }));
    return;
  }
  /* pages: the network first (always the latest version), the saved copy when offline */
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
      .catch(async () => (await caches.match(r, { ignoreSearch: true })) || caches.match('/offline.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok && /\/icons\//.test(u.pathname)) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
});
/* old data versions are dropped when a new catalog version arrives */
self.addEventListener('message', e => { if (e.data && e.data.t === 'ver') caches.open(V + '-data').then(c => c.keys().then(ks => ks.forEach(k => { const v = new URL(k.url).searchParams.get('v'); if (v && v !== e.data.v) c.delete(k); }))); });
