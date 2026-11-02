// Service worker do Smart MESA: guarda só a "moldura" (o GAS em si precisa de internet)
const CACHE = 'smart-mesa-v1'; // Mude o número (v2, v3...) quando alterar index.html ou os ícones
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './MesaIcon/Favicon.png',
  './MesaIcon/Icon180.png',
  './MesaIcon/Icon192.png',
  './MesaIcon/Icon512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (chaves) {
        return Promise.all(chaves.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // O GAS e as fontes passam direto pela rede

  // Página: rede primeiro; sem internet, usa a cópia guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(function (c) { c.put('./index.html', copia); });
          }
          return res;
        })
        .catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // Ícones e demais arquivos: usa o guardado e atualiza em segundo plano
  e.respondWith(
    caches.match(req).then(function (guardado) {
      const rede = fetch(req)
        .then(function (res) {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copia); });
          }
          return res;
        })
        .catch(function () { return guardado; });
      return guardado || rede;
    })
  );
});
