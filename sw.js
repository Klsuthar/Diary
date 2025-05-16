const CACHE_NAME = 'my-personal-diary-cache-v1'; // Consider incrementing if major assets change (e.g., v2)
const ASSETS_TO_CACHE = [
    '/', // Alias for index.html for the root path
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/images/logo.ico',
    '/images/logo.svg',
    '/images/logo16.png',
    '/images/logo32.png',
    '/images/logo64.png'
    // Note: External assets like Google Fonts and Font Awesome are not cached in this basic setup.
];

// Install event: cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching core assets');
                // Map to new Request objects to ensure 'reload' cache mode is effective for all.
                const requests = ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }));
                return cache.addAll(requests)
                           .catch(error => {
                                console.error('Service Worker: Failed to cache one or more core assets during install:', error);
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
                    // This basic SW caches only predefined local assets.
                    // For a more robust offline experience, you might consider caching
                    // network responses for assets like fonts or dynamically loaded data.
                    return networkResponse;
                }).catch(error => {
                    console.error('Service Worker: Fetch error for', event.request.url, error);
                    // Optionally, return a generic offline fallback page for HTML navigation requests
                    // if (event.request.mode === 'navigate') {
                    //   return caches.match('/offline.html'); // You would need to create and cache an offline.html
                    // }
                    throw error; // Let the browser handle the error.
                });
            })
    );
});