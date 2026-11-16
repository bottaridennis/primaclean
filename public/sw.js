/* Service worker Prima Clean: app utilizzabile offline e notifiche di sistema.
 * - Pagine: rete prima, copia in cache se offline.
 * - File statici (JS/CSS con hash, icone, font): cache prima.
 * - Le chiamate a Firebase non passano di qui: la cache dei dati la gestisce Firestore.
 */
const VERSION = 'pc-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isFont = url => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !isFont(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      hit =>
        hit ||
        fetch(req).then(res => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// Click su una notifica: apre (o porta in primo piano) l'app nella sezione giusta
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = event.notification.data && event.notification.data.link;
  const target = new URL(self.registration.scope);
  if (link) target.hash = '/' + link;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target.href).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
