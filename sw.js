// sw.js - Service Worker

const CACHE_NAME = 'my-personal-diary-cache-v4'; // Incremented version
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
                    if (cacheName !== CACHE_NAME) { 
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event: serve assets from cache, fallback to network
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return; 
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    return networkResponse;
                }).catch(error => {
                    console.error('Service Worker: Fetch error for', event.request.url, error);
                    // Consider returning an offline page for navigation requests if needed
                    // if (event.request.mode === 'navigate') {
                    //    return caches.match('offline.html'); 
                    // }
                    throw error; 
                });
            })
    );
});