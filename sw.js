const CACHE_NAME = 'my-personal-diary-cache-v2'; // Keep this version or increment if you make further asset changes
const ASSETS_TO_CACHE = [
    // CORRECTED: These paths are now relative to the service worker's location.
    // If sw.js is at /Diary/sw.js, 'index.html' becomes /Diary/index.html.
    'index.html',        // Represents the root of your PWA's scope
    'style.css',
    'script.js',
    'manifest.json',
    'images/logo.ico',
    'images/logo.svg',
    'images/logo16.png',
    'images/logo32.png',
    'images/logo64.png',
    'images/logo256.png',
    'images/logo512.png'
];

// Install event: cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching core assets for version:', CACHE_NAME);
                // For GitHub Pages sub-repo, ensure paths are correctly interpreted relative to sw.js
                // These relative paths will be resolved correctly from the SW's location.
                const requests = ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }));
                return cache.addAll(requests)
                           .catch(error => {
                                console.error('Service Worker: Failed to cache one or more core assets during install:', error, ASSETS_TO_CACHE);
                           });
            })
            .then(() => {
                console.log('Service Worker: Core assets cached successfully.');
                return self.skipWaiting();
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
                // For requests not found in cache, fetch from network.
                // The request URL will already be correct (e.g., /Diary/some-asset.js)
                // due to how the browser resolves it from the HTML page.
                return fetch(event.request).then(networkResponse => {
                    return networkResponse;
                }).catch(error => {
                    console.error('Service Worker: Fetch error for', event.request.url, error);
                    // For navigation requests (like trying to open the app),
                    // if fetch fails (e.g., offline) and it's not in cache,
                    // this could lead to a browser error page.
                    // A more robust SW might return a custom offline page here.
                    throw error;
                });
            })
    );
});