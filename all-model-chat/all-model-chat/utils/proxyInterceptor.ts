/**
 * Global network request interceptor for proxying.
 */
import { logService } from '../services/logService';

interface ProxyConfig {
  enabled: boolean;
  proxyUrl: string;
  originalDomain: string;
}

class ProxyInterceptor {
  private config: ProxyConfig;
  private originalFetch: typeof window.fetch;
  
  constructor() {
    this.config = {
      enabled: false,
      proxyUrl: '',
      originalDomain: 'generativelanguage.googleapis.com'
    };
    this.originalFetch = window.fetch.bind(window);
  }

  enable(proxyUrl: string): void {
    if (!this.config.enabled) {
        this.config.proxyUrl = proxyUrl;
        this.config.enabled = true;
        this.setupFetchInterceptor();
        logService.info(`[ProxyInterceptor] Enabled for URL: ${proxyUrl}`);
    } else if (this.config.proxyUrl !== proxyUrl) {
        this.config.proxyUrl = proxyUrl;
        logService.info(`[ProxyInterceptor] Updated proxy URL to: ${proxyUrl}`);
    }
  }

  disable(): void {
    if (this.config.enabled) {
        this.config.enabled = false;
        this.restoreOriginalFunctions();
        logService.info('[ProxyInterceptor] Disabled.');
    }
  }

  private shouldProxy(url: string): boolean {
    try {
        const urlObject = new URL(url);
        return this.config.enabled && urlObject.hostname === this.config.originalDomain;
    } catch (e) {
        // Invalid URL, likely a relative path, so don't proxy.
        return false;
    }
  }

  private transformUrl(url: string): string {
    if (!this.shouldProxy(url)) return url;
    
    const urlObject = new URL(url);
    const pathWithParams = urlObject.pathname + urlObject.search;
    const transformedUrl = new URL(pathWithParams, this.config.proxyUrl).toString();

    logService.info(`[ProxyInterceptor] Redirecting request: ${url} -> ${transformedUrl}`);
    return transformedUrl;
  }

  private setupFetchInterceptor(): void {
    const self = this;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
      
      if (self.shouldProxy(url)) {
        const proxyUrl = self.transformUrl(url);
        const newInit = { ...init };
        // Ensure credentials are not sent to the proxy, which can cause CORS issues.
        delete newInit.credentials;
        const newInput = (input instanceof Request) ? new Request(proxyUrl, { ...input, ...newInit }) : proxyUrl;
        return self.originalFetch(newInput, newInit);
      }
      
      return self.originalFetch(input, init);
    };
  }
  
  private restoreOriginalFunctions(): void {
    window.fetch = this.originalFetch;
  }
}

export const proxyInterceptor = new ProxyInterceptor();

export const initializeProxyInterceptor = (): void => {
  try {
    const settingsStr = localStorage.getItem('chatAppSettings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings.useCustomApiConfig && settings.apiProxyUrl) {
        proxyInterceptor.enable(settings.apiProxyUrl);
      }
    }
  } catch (error) {
    console.error('[ProxyInterceptor] Failed to initialize from localStorage:', error);
  }
};
