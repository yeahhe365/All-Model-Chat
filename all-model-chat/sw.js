
const CACHE_NAME = 'all-model-chat-cache-v1.7.8';
const API_HOSTS = ['generativelanguage.googleapis.com'];
const STATIC_APP_SHELL_URLS = ['/', '/index.html', '/favicon.png', '/manifest.json'];

/**
 * Fetches and parses the main HTML file to dynamically discover all critical resources.
 * @returns {Promise<string[]>} A promise that resolves to an array of URLs to cache.
 */
const getDynamicAppShellUrls = async () => {
    try {
        const response = await fetch('/index.html?sw-cache-bust=' + Date.now());
        if (!response.ok) throw new Error(`Failed to fetch index.html: ${response.statusText}`);
        const html = await response.text();
        
        const linkTagMatches = [...html.matchAll(/<link[^>]+>/gi)];
        const stylesheetUrls = linkTagMatches.map(match => match[0]).filter(tag => tag.includes('rel="stylesheet"')).map(tag => tag.match(/href="([^"]+)"/)?.[1]).filter(Boolean);
        const scriptMatches = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
        const scriptUrls = scriptMatches.map(match => match[1]);
        const uniqueUrls = [...new Set([...STATIC_APP_SHELL_URLS, ...stylesheetUrls, ...scriptUrls].filter(Boolean))];
        console.log('[SW] Dynamic App Shell URLs to cache:', uniqueUrls);
        return uniqueUrls;
    } catch (error) {
        console.error('[SW] Could not build dynamic app shell.', error);
        throw error;
    }
};

self.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;
    const { type } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
    }
});

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            console.log('[SW] Installation started.');
            const urlsToCache = await getDynamicAppShellUrls();
            const cache = await caches.open(CACHE_NAME);
            console.log(`[SW] Caching ${urlsToCache.length} dynamic app shell files.`);
            await cache.addAll(urlsToCache);
            await self.skipWaiting();
            console.log('[SW] Installation complete.');
        })()
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Activated and claimed clients.');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Pass API requests through directly
    if (API_HOSTS.some(host => url.hostname === host)) {
        event.respondWith(fetch(request));
        return;
    }

    if (request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    const fetchPromise = fetch(request).then((networkResponse) => {
                        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(error => {
                        console.warn(`[SW] Network request for ${request.url} failed:`, error);
                        if (request.mode === 'navigate' && !cachedResponse) {
                            return caches.match('/index.html');
                        }
                    });

                    return cachedResponse || fetchPromise;
                });
            })
        );
    }
});