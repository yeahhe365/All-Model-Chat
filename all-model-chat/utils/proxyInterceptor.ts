import { logService } from '../services/logService';

const APP_SETTINGS_KEY = 'chatAppSettings';
const GOOGLE_API_DOMAIN = 'generativelanguage.googleapis.com';

class ProxyInterceptor {
    private originalFetch: typeof window.fetch;
    private isEnabled: boolean = false;
    private proxyUrl: string | null = null;

    constructor() {
        this.originalFetch = window.fetch.bind(window);
    }
    
    public initialize(): void {
        this.syncWithSettings();
        // Listen for storage changes to sync automatically if settings change in another tab.
        window.addEventListener('storage', (event) => {
            if (event.key === APP_SETTINGS_KEY) {
                logService.info('Settings changed, syncing proxy interceptor.');
                this.syncWithSettings();
            }
        });
    }

    private syncWithSettings(): void {
        try {
            const stored = localStorage.getItem(APP_SETTINGS_KEY);
            if (stored) {
                const settings = JSON.parse(stored);
                if (settings.useCustomApiConfig && settings.apiProxyUrl) {
                    this.enable(settings.apiProxyUrl);
                } else {
                    this.disable();
                }
            } else {
                this.disable();
            }
        } catch (error) {
            logService.error("Failed to sync proxy settings from localStorage", { error });
            this.disable();
        }
    }

    private transformUrl(url: string): string {
        if (!this.proxyUrl) return url;
        
        try {
            const originalUrl = new URL(url);
            if (originalUrl.hostname === GOOGLE_API_DOMAIN) {
                const path = originalUrl.pathname + originalUrl.search + originalUrl.hash;
                // The user's settings provide the full base URL for the proxy.
                // We replace the Google domain with the proxy URL's origin and base path.
                const proxyBase = new URL(this.proxyUrl);
                // Construct the new URL ensuring the path is correctly appended.
                const finalUrl = new URL(path, proxyBase.origin + proxyBase.pathname).href;
                
                logService.debug(`Proxying request: ${url} -> ${finalUrl}`);
                return finalUrl;
            }
        } catch (e) {
            logService.error(`Invalid URL for proxy transformation: ${url}`, e);
        }
        
        return url;
    }

    private enable(proxyUrl: string): void {
        if (this.isEnabled && this.proxyUrl === proxyUrl) return;

        this.proxyUrl = proxyUrl.trim().replace(/\/$/, ''); // Remove trailing slash
        this.isEnabled = true;
        
        const self = this;
        window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            
            if (self.isEnabled) {
                const transformedUrl = self.transformUrl(url);
                if (transformedUrl !== url) {
                    const newInput = typeof input === 'string' ? transformedUrl : new Request(transformedUrl, input);
                    return self.originalFetch(newInput, init);
                }
            }
            
            return self.originalFetch(input, init);
        };
        logService.info(`Proxy fetch interceptor enabled for URL: ${this.proxyUrl}`);
    }

    private disable(): void {
        if (!this.isEnabled) return;
        this.isEnabled = false;
        this.proxyUrl = null;
        window.fetch = this.originalFetch;
        logService.info('Proxy fetch interceptor disabled.');
    }
}

const proxyInterceptor = new ProxyInterceptor();

export const initializeProxyInterceptor = (): void => {
    proxyInterceptor.initialize();
};
