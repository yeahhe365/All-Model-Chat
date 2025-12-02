
import { logService } from './logService';

const TARGET_HOST = 'generativelanguage.googleapis.com';

let originalFetch: typeof window.fetch = window.fetch;
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
     * Mounts the interceptor to window.fetch.
     * Should be called once at app startup.
     */
    mount: () => {
        // Prevent double mounting
        if ((window.fetch as any).__isAllModelChatInterceptor) return;

        // Save original fetch in case it wasn't saved correctly at module level
        originalFetch = window.fetch;

        const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            // Pass through if disabled or no proxy configured
            if (!isInterceptorEnabled || !currentProxyUrl) {
                return originalFetch(input, init);
            }

            let urlStr = '';
            let originalRequest: Request | null = null;

            // Normalize input to string
            if (typeof input === 'string') {
                urlStr = input;
            } else if (input instanceof URL) {
                urlStr = input.toString();
            } else if (input instanceof Request) {
                urlStr = input.url;
                originalRequest = input;
            }

            // Check if the request is targeting the Gemini API host
            if (urlStr.includes(TARGET_HOST)) {
                try {
                    const targetOrigin = "https://generativelanguage.googleapis.com";
                    
                    // Rewrite the URL
                    // Example: https://generativelanguage.googleapis.com/v1beta/... -> https://my-proxy.com/v1beta/...
                    const newUrl = urlStr.replace(targetOrigin, currentProxyUrl);
                    
                    // logService.debug(`[NetworkInterceptor] Rerouting: ${urlStr} -> ${newUrl}`, { category: 'NETWORK' });

                    if (originalRequest) {
                        // Clone the original request with the new URL
                        // We pass the original request as the second argument (init) to preserve body/headers
                        // Note: We intentionally create a new Request object.
                        const newReq = new Request(newUrl, originalRequest);
                        return originalFetch(newReq, init);
                    }
                    
                    return originalFetch(newUrl, init);
                } catch (e) {
                    console.error("[NetworkInterceptor] Failed to rewrite URL", e);
                    // Fallback to original
                }
            }

            return originalFetch(input, init);
        };
        
        // Mark function to prevent double-wrapping
        (patchedFetch as any).__isAllModelChatInterceptor = true;
        
        window.fetch = patchedFetch;
        logService.info("[NetworkInterceptor] Network interceptor mounted.", { category: 'SYSTEM' });
    }
};
