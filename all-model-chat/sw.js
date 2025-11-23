
const CACHE_NAME = 'all-model-chat-cache-v1.7.3';
const API_HOSTS = ['generativelanguage.googleapis.com'];
const STATIC_APP_SHELL_URLS = ['/', '/index.html', '/favicon.png', '/manifest.json'];

let proxyUrl = null;

/**
 * Fetches and parses the main HTML file to dynamically discover all critical resources.
 * @returns {Promise<string[]>} A promise that resolves to an array of URLs to cache.
 */
const getDynamicAppShellUrls = async () => {
    try {
        const response = await fetch('/index.html?sw-cache-bust=' + Date.now());
        if (!response.ok) throw new Error(`Failed to fetch index.html: ${response.statusText}`);
        const html = await response.text();
        const importmapMatch = html.match(/<script type="importmap"[^>]*>([\s\S]*?)<\/script>/);
        let importmapUrls = [];
        if (importmapMatch && importmapMatch[1]) {
            try {
                const importmapJson = JSON.parse(importmapMatch[1]);
                if (importmapJson.imports) importmapUrls = Object.values(importmapJson.imports);
            } catch (e) { console.error('[SW] Failed to parse importmap:', e); }
        }
        const linkTagMatches = [...html.matchAll(/<link[^>]+>/gi)];
        const stylesheetUrls = linkTagMatches.map(match => match[0]).filter(tag => tag.includes('rel="stylesheet"')).map(tag => tag.match(/href="([^"]+)"/)?.[1]).filter(Boolean);
        const scriptMatches = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
        const scriptUrls = scriptMatches.map(match => match[1]);
        const uniqueUrls = [...new Set([...STATIC_APP_SHELL_URLS, ...importmapUrls, ...stylesheetUrls, ...scriptUrls].filter(Boolean))];
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
        case 'SET_PROXY_URL':
            proxyUrl = event.data.url || null;
            console.log('[SW] Proxy URL set to:', proxyUrl);
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
    
    // 记录所有 API 请求以便调试
    if (API_HOSTS.includes(url.hostname)) {
        console.log('[SW] Intercepting API request:', request.url);
        console.log('[SW] Proxy URL:', proxyUrl);
    }

    // 如果设置了代理 URL，并且请求的目标主机在 API_HOSTS 列表中（例如 generativelanguage.googleapis.com）
    // 则拦截请求并替换为代理 URL。这适用于任何版本路径 (v1, v1beta 等)。
    if (proxyUrl && API_HOSTS.includes(url.hostname)) {
        console.log('[SW] Redirecting to proxy:', proxyUrl);
        
        // 获取路径和查询参数 (e.g. /v1beta/models?key=...)
        const pathAndQuery = url.pathname + url.search;
        
        // 处理 proxyUrl 可能带有的尾部斜杠，确保拼接正确
        const safeProxyUrl = proxyUrl.endsWith('/') ? proxyUrl.slice(0, -1) : proxyUrl;
        
        const newUrl = safeProxyUrl + pathAndQuery;
        
        const newRequest = new Request(newUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            mode: 'cors',
            credentials: 'omit'
        });
        event.respondWith(fetch(newRequest));
        return;
    }

    // 如果没有代理 URL，但是是 API 请求，直接通过 (不走缓存)
    if (API_HOSTS.some(host => url.hostname === host)) {
        console.log('[SW] Direct API request (no proxy):', request.url);
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
