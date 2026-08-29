// ── Service worker ──────────────────────────────────────────────────────────
// Existe por dos razones: sin un manejador de fetch, Chrome no ofrece instalar la
// app; y con el, la app abre aunque no haya señal.
//
// RED PRIMERO, A PROPOSITO. La app es UN archivo que se despliega a cada rato: si el
// service worker sirviera la copia guardada primero, el telefono se quedaria clavado
// en una version vieja y las correcciones no llegarian nunca. Se pide siempre a la
// red; la copia solo entra si la red falla.
const CACHE = 'mlb-picks-v1';
const BASE  = ['./', './index.html', './manifest.webmanifest',
               './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Solo se guarda lo propio. Las APIs (MLB, Supabase, The Odds) NUNCA se cachean:
  // servir cuotas viejas seria peor que no servir nada.
  const propio = new URL(req.url).origin === self.location.origin;
  if (!propio) return;

  e.respondWith(
    fetch(req)
      .then(r => {
        if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return r;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
