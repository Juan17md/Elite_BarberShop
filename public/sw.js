self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A minimal fetch handler is required by some browsers to pass the PWA installation criteria.
  // We're just passing the request through to the network.
  event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
});
