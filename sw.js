// sw.js - Service Worker

// --- Cache Configuration ---

// Incremented version to trigger a service worker update
const APP_SHELL_CACHE_NAME = 'my-personal-diary-static-v5';
const DYNAMIC_CACHE_NAME = 'my-personal-diary-dynamic-v5';

// Assets that form the core of the application's UI (the "app shell")
const APP_SHELL_ASSETS = [
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
    'images/logo512.png'
];

// --- Service Worker Lifecycle Events ---

/**
 * Install Event:
 * Caches the core application shell assets. This runs once when the service worker is installed.
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
 * This event fires after 'install' and when the new service worker takes control.
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
 * Intercepts all network requests made by the application.
 * It applies different caching strategies based on the request type.
 */
self.addEventListener('fetch', event => {
    // We only care about GET requests for caching.
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // Strategy 1: Stale-While-Revalidate for external assets (fonts, icons)
    // This provides both speed (from cache) and freshness (background update).
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com') {
        event.respondWith(staleWhileRevalidate(event.request));
    }
    // Strategy 2: Cache First for our local App Shell assets
    // These were pre-cached on install, so we can serve them directly from the cache.
    else if (APP_SHELL_ASSETS.includes(url.pathname.substring(1)) || url.pathname === '/') {
         event.respondWith(caches.match(event.request, { ignoreSearch: true }));
    }
    // Strategy 3: Network First, Fallback to Cache for other requests
    // (This example doesn't have other requests, but it's a good default)
    else {
        event.respondWith(networkFirstFallbackToCache(event.request));
    }
});


// --- Caching Strategy Implementations ---

/**
 * Stale-While-Revalidate Strategy:
 * 1. Responds with the cached version immediately if available (stale).
 * 2. In the background, fetches a fresh version from the network and updates the cache (revalidate).
 * 3. If not in cache, fetches from the network and caches the response.
 * @param {Request} request The incoming request.
 * @returns {Promise<Response>}
 */
function staleWhileRevalidate(request) {
    return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
            const fetchPromise = fetch(request).then(networkResponse => {
                // Check if we received a valid response
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(error => {
                 console.error('[Service Worker] Fetch failed; returning cached response if available.', request.url, error);
                 // If network fails, and we have a cached response, this error is gracefully handled.
                 // If there's no cached response either, the promise will reject, leading to a network error on the page.
                 // This is expected offline behavior for a resource not in the cache.
            });

            // Return the cached response immediately if it exists, otherwise wait for the network response.
            return cachedResponse || fetchPromise;
        });
    });
}


/**
 * Network First, Fallback to Cache Strategy:
 * 1. Tries to fetch from the network first to get the most up-to-date content.
 * 2. If the network fails (e.g., offline), it falls back to the cache.
 * @param {Request} request The incoming request.
 * @returns {Promise<Response>}
 */
function networkFirstFallbackToCache(request) {
    return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return fetch(request)
            .then(networkResponse => {
                // If the fetch is successful, cache the new response for future offline use
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            })
            .catch(() => {
                // If the network fetch fails, try to find a match in the cache
                return cache.match(request);
            });
    });
}
