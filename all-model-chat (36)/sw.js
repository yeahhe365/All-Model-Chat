const CACHE_NAME = 'all-model-chat-cache-v2';
const APP_SHELL_URLS = [
    '/', // This ensures the root is cached.
    '/index.html',
    '/index.tsx', // The main script.
    '/favicon.png',
    '/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-dark.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/a11y-dark.min.css',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
];

// Install the service worker and cache the app shell.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell');
                // addAll can fail if one of the resources fails to be fetched.
                // It's better to cache them individually to be more robust.
                return Promise.all(
                    APP_SHELL_URLS.map(url => {
                        return cache.add(new Request(url, { mode: 'cors' })).catch(reason => {
                            console.log(`[Service Worker] Failed to cache ${url}: ${reason}`);
                        });
                    })
                );
            })
    );
});

// Clean up old caches on activation.
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Use the Stale-While-Revalidate strategy for all GET requests.
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // If the request is successful, update the cache.
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(err => {
                    // Network fetch failed, which is fine if we have a cached response.
                    console.warn(`[Service Worker] Fetch failed for: ${event.request.url}`, err);
                    // If there was no cached response, the promise will reject and the browser will show an error.
                });

                // Return the cached response immediately if it exists,
                // and let the fetch happen in the background to update the cache.
                return cachedResponse || fetchPromise;
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});