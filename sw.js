// sw.js - Service Worker

const CACHE_NAME = 'my-personal-diary-cache-v2'; // Increment version if assets change significantly
const ASSETS_TO_CACHE = [
    // Paths are relative to the service worker's location (root in this case)
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    // It's good practice to cache essential images, especially icons
    'images/logo.ico',
    'images/logo.svg',
    'images/logo16.png',
    'images/logo32.png',
    'images/logo64.png',
    'images/logo256.png', // Used as apple-touch-icon and PWA icon
    'images/logo512.png'  // Larger PWA icon
    // Add other critical assets like fonts if locally hosted, or common images
];

// Install event: cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching core assets for version:', CACHE_NAME);
                // Use 'reload' to ensure fresh copies are fetched during install, bypassing HTTP cache
                const requests = ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }));
                return cache.addAll(requests)
                           .catch(error => {
                                console.error('Service Worker: Failed to cache one or more core assets during install:', error, ASSETS_TO_CACHE);
                                // Optionally, you could decide not to install if critical assets fail
                           });
            })
            .then(() => {
                console.log('Service Worker: Core assets cached successfully.');
                return self.skipWaiting(); // Activate new SW immediately
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
                    if (cacheName !== CACHE_NAME) { // If cache name is different from current
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Ensure the new service worker takes control of all clients immediately.
            return self.clients.claim();
        })
    );
});

// Fetch event: serve assets from cache, fallback to network
self.addEventListener('fetch', event => {
    // We only want to handle GET requests for caching
    if (event.request.method !== 'GET') {
        return; // Do not intercept non-GET requests
    }

    event.respondWith(
        caches.match(event.request) // Check if the request is in cache
            .then(cachedResponse => {
                if (cachedResponse) {
                    // If found in cache, return the cached response
                    return cachedResponse;
                }
                // If not in cache, fetch from the network
                return fetch(event.request).then(networkResponse => {
                    // Optionally, you could cache new requests here if desired (dynamic caching)
                    // For this app, we are primarily pre-caching, so just returning the network response is fine.
                    // If you wanted to cache dynamically:
                    // if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    //     const responseToCache = networkResponse.clone();
                    //     caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    // }
                    return networkResponse;
                }).catch(error => {
                    // Handle fetch errors (e.g., offline)
                    console.error('Service Worker: Fetch error for', event.request.url, error);
                    // For navigation requests, you might want to return a custom offline page here:
                    // if (event.request.mode === 'navigate') {
                    //    return caches.match('offline.html'); // Assuming you have an offline.html cached
                    // }
                    throw error; // Re-throw the error to let the browser handle it
                });
            })
    );
});
