// Service worker del Explorador del Sistema Solar (lo genera vite.config.js al compilar).
// Guarda la web y las texturas para que funcione como app y sin conexión.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `sistema-solar-${VERSION}`;
const FONTS = 'sistema-solar-fuentes';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sistema-solar-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fuentes de Google: se usa la copia guardada y se actualiza en segundo plano.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONTS).then(async (c) => {
      const cached = await c.match(req);
      const fresh = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => cached);
      return cached || fresh;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Páginas: primero la red (para recibir actualizaciones) y, sin conexión, la copia guardada.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put('/index.html', copy));
      return res;
    }).catch(() => caches.match('/index.html')));
    return;
  }

  // Resto (código, texturas, iconos): primero la caché.
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
