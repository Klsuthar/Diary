const CACHE_NAME = 'my-personal-diary-cache-v1';
const ASSETS_TO_CACHE = [
    '/', // Alias for index.html for the root path
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/images/logo.png' // Cache the logo
    // Note: External assets like Google Fonts and Font Awesome are not cached in this basic setup
    // to keep it simple. For full offline functionality of these, you'd need to add them here
    // or implement a more robust caching strategy (e.g., stale-while-revalidate for external resources).
];

// Install event: cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching core assets');
                return cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }))) // Force reload from network during install
                           .catch(error => {
                                console.error('Service Worker: Failed to cache one or more core assets during install:', error);
                                // Optionally, you can decide if this is a fatal error for the SW install.
                                // For now, we log it and let the SW install proceed if other assets succeed.
                           });
            })
            .then(() => {
                console.log('Service Worker: Core assets cached successfully.');
            })
            .catch(error => {
                console.error('Service Worker: Failed to open cache or complete caching during install:', error);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // Ensure new SW takes control of clients immediately
        })
    );
});

// Fetch event: serve assets from cache, fallback to network
self.addEventListener('fetch', event => {
    // We only want to handle GET requests for caching
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // If a cached response is found, return it.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not in cache, fetch from network.
                return fetch(event.request).then(networkResponse => {
                    // We don't cache responses from external domains in this simple setup to avoid issues.
                    // You might want to cache opaque responses for fonts, etc., but that's more complex.
                    // Example: if (ASSETS_TO_CACHE.includes(event.request.url) || event.request.url.startsWith(self.location.origin))
                    // This service worker primarily caches predefined local assets.
                    return networkResponse;
                }).catch(error => {
                    console.error('Service Worker: Fetch error for', event.request.url, error);
                    // Optionally, return a generic offline fallback page for HTML navigation requests
                    // if (event.request.mode === 'navigate') {
                    //   return caches.match('/offline.html'); // You would need to create and cache an offline.html
                    // }
                    // For other requests, just let the browser handle the error (e.g. show default offline error)
                    throw error;
                });
            })
    );
});