const CACHE_NAME = "discover-v1";
const BASE = "/discover/";

const urlsToCache = [
  BASE,
  BASE + "index.html",
  BASE + "form.html",
  BASE + "history.html",
  BASE + "style.css",
  BASE + "app.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
