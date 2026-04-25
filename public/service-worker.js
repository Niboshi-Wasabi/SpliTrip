// Keep SW intentionally minimal.
// Do not intercept Next.js chunk requests; interception can cause stale/404 loops.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});