"use strict";

const CACHE_NAME = "localserve-cache-v1";
const OFFLINE_URL = "/offline.html";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  OFFLINE_URL,
  "/favicon.svg"
];

// 1. Install Event - Cache Static Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching static assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Cache Versioning & Purge Old Cache Files
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing stale cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Cache Fallbacks and Offline HTML Fallback Page
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).catch((err) => {
        // Fallback to offline page for document requests (navigation)
        if (event.request.mode === "navigate") {
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.match(OFFLINE_URL);
          });
        }
        return Promise.reject(err);
      });
    })
  );
});

// 4. Listen for incoming Web Push events from VAPID server
self.addEventListener("push", (event) => {
  let title = "LocalServe Notification";
  let body = "You have a new update.";
  let data = { url: "/user/bookings" };

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      data = payload.data || data;
    } catch (err) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: data,
    vibrate: [100, 50, 100],
    actions: [
      { action: "view", title: "View Details" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 5. Handle user clicking the active system notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/user/bookings";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus if window already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
