const CACHE = 'estudia-v1'; // Cambia el número para publicar una nueva versión
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Cache first, con respaldo a la red (funciona sin conexión)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('index.html'))));
});

// Notificaciones push (requieren un servidor push para enviarlas)
self.addEventListener('push', e => {
  const d = e.data ? e.data.text() : 'Tienes tareas pendientes en Estudia+';
  e.waitUntil(self.registration.showNotification('Estudia+', { body: d, icon: 'icons/icon-192.png' }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./'));
});
