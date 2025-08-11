// Use a specific version to ensure stability, matching the one in the app's import map.
try {
  self.importScripts('https://esm.sh/@google/genai@1.2.0');
} catch (e) {
  console.error('[SW] Failed to import @google/genai SDK:', e);
}

const CACHE_NAME = 'all-model-chat-cache-v3';
const API_HOSTS = ['generativelanguage.googleapis.com'];
const TARGET_API_PREFIX = 'https://generativelanguage.googleapis.com/v1beta';
const TARGET_UPLOAD_PREFIX = 'https://generativelanguage.googleapis.com/upload/v1beta';
const STATIC_APP_SHELL_URLS = ['/', '/index.html', '/favicon.png', '/manifest.json'];

let proxyUrl = null;

// Map to track active streaming requests and allow them to be aborted.
const activeStreams = new Map();

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

async function handleStreamRequest(generationId, payload, clientId) {
  if (!self.GoogleGenAI) {
    const client = await self.clients.get(clientId);
    if (client) {
      client.postMessage({ type: 'GEMINI_STREAM_ERROR', generationId, payload: { message: 'Service Worker could not load the Gemini SDK.' } });
    }
    return;
  }

  const { apiKey, modelId, contents, config } = payload;
  const controller = new AbortController();
  activeStreams.set(generationId, { controller });
  let hasError = false;

  try {
    // 让 fetch 事件处理器处理实际的网络请求（可走代理）
    const ai = new self.GoogleGenAI({ apiKey });
    const result = await ai.models.generateContentStream({ model: modelId, contents, config });

    for await (const chunk of result) {
      if (controller.signal.aborted) {
        console.log(`[SW] Stream ${generationId} aborted.`);
        break;
      }
      const client = await self.clients.get(clientId);
      if (client) {
        client.postMessage({ type: 'GEMINI_STREAM_CHUNK', generationId, payload: chunk });
      } else {
        console.warn(`[SW] Client ${clientId} not found for stream ${generationId}. Aborting.`);
        controller.abort();
        break;
      }
    }
  } catch (error) {
    hasError = true;
    console.error(`[SW] Error during Gemini stream for ${generationId}:`, error);
    const client = await self.clients.get(clientId);
    if (client) {
      client.postMessage({ type: 'GEMINI_STREAM_ERROR', generationId, payload: { name: error.name, message: error.message } });
    }
  } finally {
    if (!hasError) {
      const client = await self.clients.get(clientId);
      if (client) client.postMessage({ type: 'GEMINI_STREAM_COMPLETE', generationId });
    }
    activeStreams.delete(generationId);
  }
}

function handleStreamAbort(generationId) {
  if (activeStreams.has(generationId)) {
    activeStreams.get(generationId).controller.abort();
  }
}

self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;
  const { type, generationId, payload } = event.data;

  switch (type) {
    case 'GEMINI_STREAM_REQUEST':
      handleStreamRequest(generationId, payload, event.source.id);
      break;
    case 'GEMINI_STREAM_ABORT':
      handleStreamAbort(generationId);
      break;
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

// 将 Google API URL 替换到代理（同时覆盖 /v1beta 与 /upload/v1beta）
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 记录 API 请求（便于排查）
  if (request.url.includes('generativelanguage.googleapis.com')) {
    console.log('[SW] Intercepting API request:', request.url);
    console.log('[SW] Proxy URL:', proxyUrl);
  }

  if (proxyUrl && (request.url.startsWith(TARGET_API_PREFIX) || request.url.startsWith(TARGET_UPLOAD_PREFIX))) {
    // 规范化代理根
    const base = String(proxyUrl).trim().replace(/\/+$/, '');
    const baseRoot = base.replace(/\/v1(beta)?$/i, '');

    const isUpload = request.url.startsWith(TARGET_UPLOAD_PREFIX);
    const proxyBase = isUpload ? `${baseRoot}/upload/v1beta` : (/\/v1(beta)?$/i.test(base) ? base : `${baseRoot}/v1beta`);
    const targetPrefix = isUpload ? TARGET_UPLOAD_PREFIX : TARGET_API_PREFIX;

    const newUrl = request.url.replace(targetPrefix, proxyBase);
    console.log('[SW] Redirecting to proxy:', newUrl);

    const newRequest = new Request(newUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      mode: 'cors',
      credentials: 'omit',
      cache: request.cache,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      integrity: request.integrity,
    });

    event.respondWith(fetch(newRequest));
    return;
  }

  // 如果没有代理 URL，但是是 Google API 请求，直接放行
  if (API_HOSTS.some(host => new URL(request.url).hostname === host)) {
    console.log('[SW] Direct API request (no proxy):', request.url);
    event.respondWith(fetch(request));
    return;
  }

  // 其余 GET 走缓存优化
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
