// sw.js - Service Worker

// --- Cache Configuration ---
const APP_SHELL_CACHE_NAME = 'my-personal-diary-static-v6'; // Incremented version
const DYNAMIC_CACHE_NAME = 'my-personal-diary-dynamic-v6'; // Incremented version

// Assets that form the core of the application's UI (the "app shell")
// Includes external resources to ensure the app is fully functional offline after the first visit.
const APP_SHELL_ASSETS = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    'images/logo.ico',
    'images/logo.svg',
    'images/logo16.png',
    'images/logo32.png',
    'images/logo64.png',
    'images/logo256.png',
    'images/logo512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap'
];

// --- Service Worker Lifecycle Events ---

/**
 * Install Event:
 * Caches the core application shell assets. This runs once when the service worker is installed or updated.
 */
self.addEventListener('install', event => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(APP_SHELL_CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching App Shell:', APP_SHELL_ASSETS);
                // Use 'reload' to ensure fresh copies are fetched from the server, bypassing the browser's HTTP cache.
                const requests = APP_SHELL_ASSETS.map(url => new Request(url, { cache: 'reload' }));
                return cache.addAll(requests);
            })
            .then(() => {
                console.log('[Service Worker] App Shell cached successfully.');
                // Force the waiting service worker to become the active service worker.
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Failed to cache App Shell during install:', error);
            })
    );
});

/**
 * Activate Event:
 * Cleans up old caches to remove outdated assets and free up storage.
 */
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete any caches that are not the current static or dynamic caches
                    if (cacheName !== APP_SHELL_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Old caches cleaned up.');
            // Take control of all open clients (pages) without requiring a reload.
            return self.clients.claim();
        })
    );
});

// --- Fetch Event: The Core of Offline Functionality ---

/**
 * Fetch Event:
 * Intercepts all network requests made by the application and applies caching strategies.
 */
self.addEventListener('fetch', event => {
    const { request } = event;

    // For navigation requests (e.g., loading the HTML page), use a "Network Falling Back to Cache" strategy.
    // This ensures users get the latest version of the app if they are online,
    // but still allows the app to load from the cache if they are offline.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // If the network request fails (e.g., user is offline), serve the main index.html from the cache.
                    console.log('[Service Worker] Navigation fetch failed. Serving offline fallback from cache.');
                    return caches.match('index.html');
                })
        );
        return;
    }

    // For all other requests (CSS, JS, fonts, images), use a "Cache First, Falling Back to Network" strategy.
    // This is ideal for static assets as it serves them instantly from the cache if available.
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // If the asset is in the cache, return it immediately.
                    return cachedResponse;
                }
                // If the asset is not in the cache, fetch it from the network.
                return fetch(request).then(networkResponse => {
                    // Optional: Add the newly fetched asset to the dynamic cache for future offline use.
                    if (networkResponse && networkResponse.status === 200) {
                        return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                            cache.put(request, networkResponse.clone());
                            return networkResponse;
                        });
                    }
                    return networkResponse;
                });
            })
            .catch(error => {
                console.error('[Service Worker] Fetch failed:', error);
                // Here you could return a fallback asset, like a placeholder image, if needed.
            })
    );
});