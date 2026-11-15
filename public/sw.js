// Self-destructing service worker to purge stale cached bundles (e.g., index-CLMnvV38.js)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch {
        // Ignore cache cleanup errors
      }
      try {
        await self.registration.unregister();
      } catch {
        // Ignore unregister errors
      }
      try {
        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const client of windowClients) {
          client.navigate(client.url);
        }
      } catch {
        // Ignore client navigation errors
      }
    })()
  );
});
