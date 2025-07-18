const CACHE_NAME = 'all-model-chat-cache-v3'; // Increased version number
const API_HOSTS = ['generativelanguage.googleapis.com'];
const TARGET_URL_PREFIX = 'https://generativelanguage.googleapis.com/v1beta';

// The static part of the app shell. Dynamic resources will be added to this.
const STATIC_APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/logo.svg',
    '/manifest.json',
];

let proxyUrl = null;

/**
 * Fetches and parses the main HTML file to dynamically discover all critical
 * resources like CSS, JS from importmaps, and other scripts.
 * @returns {Promise<string[]>} A promise that resolves to an array of URLs to cache.
 */
const getDynamicAppShellUrls = async () => {
    try {
        // Fetch with a cache-busting query parameter to ensure we get the latest version.
        const response = await fetch('/index.html?sw-cache-bust=' + Date.now());
        if (!response.ok) {
            throw new Error(`Failed to fetch index.html: ${response.statusText}`);
        }
        const html = await response.text();

        // 1. Extract from importmap
        const importmapMatch = html.match(/<script type="importmap"[^>]*>([\s\S]*?)<\/script>/);
        let importmapUrls = [];
        if (importmapMatch && importmapMatch[1]) {
            try {
                const importmapJson = JSON.parse(importmapMatch[1]);
                if (importmapJson.imports) {
                    importmapUrls = Object.values(importmapJson.imports);
                }
            } catch (e) {
                console.error('[SW] Failed to parse importmap:', e);
            }
        }
        
        // 2. Extract from <link rel="stylesheet"> tags
        const linkTagMatches = [...html.matchAll(/<link[^>]+>/gi)];
        const stylesheetUrls = linkTagMatches
            .map(match => match[0]) // Get the full tag string
            .filter(tag => tag.includes('rel="stylesheet"'))
            .map(tag => {
                const hrefMatch = tag.match(/href="([^"]+)"/);
                return hrefMatch ? hrefMatch[1] : null;
            })
            .filter(Boolean); // Filter out any nulls

        // 3. Extract from <script src="..."> (includes module scripts)
        const scriptMatches = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
        const scriptUrls = scriptMatches.map(match => match[1]);

        // Combine all discovered URLs, filter out any potential null/undefined values, and remove duplicates.
        const allUrls = [...STATIC_APP_SHELL_URLS, ...importmapUrls, ...stylesheetUrls, ...scriptUrls];
        const uniqueUrls = [...new Set(allUrls.filter(Boolean))];
        
        console.log('[SW] Dynamic App Shell URLs to cache:', uniqueUrls);
        return uniqueUrls;
    } catch (error) {
        console.error('[SW] Could not build dynamic app shell. Installation will fail.', error);
        // Re-throw the error to ensure the service worker installation fails if we can't build the shell.
        // This prevents an incomplete or broken offline experience.
        throw error;
    }
};

// Listen for messages from the client.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'SET_PROXY_URL') {
        proxyUrl = event.data.url || null;
    }
});

// Install: Cache the app shell.
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


// Activate: Clean up old caches.
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

// Fetch: Intercept network requests.
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Proxy logic: If a proxyUrl is set and the request is for the Gemini API, rewrite the URL.
    if (proxyUrl && request.url.startsWith(TARGET_URL_PREFIX)) {
        const newUrl = request.url.replace(TARGET_URL_PREFIX, proxyUrl);
        const newRequest = new Request(newUrl, request);
        event.respondWith(fetch(newRequest));
        return;
    }

    // For non-proxied API calls, always go to the network and do not cache.
    if (API_HOSTS.some(host => new URL(request.url).hostname === host)) {
        event.respondWith(fetch(request));
        return;
    }

    // For other GET requests, use a "Stale-While-Revalidate" strategy.
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
                            console.log('[SW] Serving app shell for navigation fallback.');
                            return caches.match('/index.html');
                        }
                    });

                    return cachedResponse || fetchPromise;
                });
            })
        );
    }
});