
import { logService } from './logService';

const TARGET_HOST_PART = 'googleapis.com';

// Capture the originals immediately
let originalFetch: typeof window.fetch = window.fetch;
let OriginalWebSocket: typeof WebSocket = window.WebSocket;

let currentProxyUrl: string | null = null;
let isInterceptorEnabled = false;

export const networkInterceptor = {
    /**
     * Configure the interceptor with current settings.
     */
    configure: (enabled: boolean, proxyUrl: string | null) => {
        isInterceptorEnabled = enabled;
        // Remove trailing slash to ensure clean path concatenation
        currentProxyUrl = proxyUrl ? proxyUrl.replace(/\/$/, '') : null;
        
        if (isInterceptorEnabled && currentProxyUrl) {
            logService.debug(`[NetworkInterceptor] Configured. Target: ${currentProxyUrl}`, { category: 'NETWORK' });
        }
    },

    /**
     * Mounts the interceptor to window.fetch and window.WebSocket.
     * Should be called once at app startup.
     */
    mount: () => {
        // Prevent double mounting
        if ((window.fetch as any).__isAllModelChatInterceptor) return;

        // --- Fetch Interceptor ---
        originalFetch = window.fetch;

        const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            if (!isInterceptorEnabled || !currentProxyUrl) {
                return originalFetch(input, init);
            }

            let urlStr = '';
            let originalRequest: Request | null = null;

            if (typeof input === 'string') {
                urlStr = input;
            } else if (input instanceof URL) {
                urlStr = input.toString();
            } else if (input instanceof Request) {
                urlStr = input.url;
                originalRequest = input;
            }

            if (urlStr.includes(TARGET_HOST_PART) || urlStr.includes('generativelanguage')) {
                try {
                    const targetOrigin = "https://generativelanguage.googleapis.com";
                    
                    // Simple replacement strategy: Replace the official origin with the proxy origin
                    // This assumes the proxy handles the exact same path structure
                    let newUrl = urlStr;
                    
                    // If the proxy URL contains a path prefix (e.g. /gemini/v1beta), we might need careful handling.
                    // However, standard replacement of the base origin is usually the safest first step for HTTP.
                    if (urlStr.startsWith(targetOrigin)) {
                        newUrl = urlStr.replace(targetOrigin, currentProxyUrl);
                    } else {
                         // Fallback for other google domains if needed, or straight replacement if it matches the pattern
                         // For safety, we mostly care about generativelanguage.googleapis.com
                         newUrl = urlStr.replace(/https:\/\/[^/]*googleapis\.com/, currentProxyUrl);
                    }

                    // Fix Vertex AI / Express compatibility patches
                    if (newUrl.includes('/v1/v1beta/')) {
                        newUrl = newUrl.replace('/v1/v1beta/', '/v1/');
                    } else if (newUrl.includes('/v1/v1/')) {
                        newUrl = newUrl.replace('/v1/v1/', '/v1/');
                    }
                    
                    if (newUrl.includes('/v1beta/v1beta')) {
                        newUrl = newUrl.replace('/v1beta/v1beta', '/v1beta');
                    }
                    
                    // Clean double slashes
                    newUrl = newUrl.replace(/([^:]\/)\/+/g, "$1");

                    if (originalRequest) {
                        const newReq = new Request(newUrl, originalRequest);
                        return originalFetch(newReq, init);
                    }
                    
                    return originalFetch(newUrl, init);
                } catch (e) {
                    console.error("[NetworkInterceptor] Failed to rewrite Fetch URL", e);
                }
            }

            return originalFetch(input, init);
        };
        
        (patchedFetch as any).__isAllModelChatInterceptor = true;
        
        try {
            window.fetch = patchedFetch;
        } catch (e) {
            console.error("[NetworkInterceptor] Failed to mount fetch interceptor.", e);
        }

        // --- WebSocket Interceptor ---
        OriginalWebSocket = window.WebSocket;

        class PatchedWebSocket extends OriginalWebSocket {
            constructor(url: string | URL, protocols?: string | string[]) {
                let finalUrl = url.toString();

                // Only intercept if enabled and it looks like a Gemini WebSocket connection
                if (isInterceptorEnabled && currentProxyUrl && (finalUrl.includes(TARGET_HOST_PART) || finalUrl.includes('generativelanguage'))) {
                    try {
                        const proxyUrlObj = new URL(currentProxyUrl);
                        const targetUrlObj = new URL(finalUrl);

                        // 1. Determine Proxy Hostname
                        const proxyHostname = proxyUrlObj.hostname;
                        
                        // 2. Determine Proxy Protocol (ws or wss) based on proxy http/https
                        const proxyProtocol = proxyUrlObj.protocol === 'http:' ? 'ws:' : 'wss:';

                        // 3. Reconstruct URL
                        // We keep the path from the original SDK request (e.g. /ws/google.ai.generativelanguage...)
                        // but switch the host and protocol to the proxy.
                        targetUrlObj.hostname = proxyHostname;
                        targetUrlObj.protocol = proxyProtocol;
                        targetUrlObj.port = proxyUrlObj.port; // Preserve port if proxy has one (e.g. localhost:8787)

                        finalUrl = targetUrlObj.toString();
                        
                        logService.debug(`[NetworkInterceptor] Rerouted WebSocket: -> ${finalUrl}`, { category: 'NETWORK' });
                    } catch (e) {
                        console.error("[NetworkInterceptor] Failed to rewrite WebSocket URL", e);
                    }
                }

                super(finalUrl, protocols);
            }
        }

        try {
            window.WebSocket = PatchedWebSocket;
        } catch (e) {
             console.error("[NetworkInterceptor] Failed to mount WebSocket interceptor.", e);
        }

        logService.info("[NetworkInterceptor] Network interceptor (Fetch + WebSocket) mounted.", { category: 'SYSTEM' });
    }
};
