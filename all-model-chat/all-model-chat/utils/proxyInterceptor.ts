import { logService } from '../services/logService';

interface ProxyConfig {
  enabled: boolean;
  proxyUrl: string;
  originalDomain: string;
}

class ProxyInterceptor {
  private config: ProxyConfig;
  private originalFetch: typeof window.fetch;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;

  constructor() {
    this.config = {
      enabled: false,
      proxyUrl: '', // Will be set on enable
      originalDomain: 'generativelanguage.googleapis.com'
    };

    this.originalFetch = window.fetch.bind(window);
    this.originalXHROpen = XMLHttpRequest.prototype.open;
  }

  enable(proxyUrl: string): void {
    if (!proxyUrl) return;
    this.config.proxyUrl = proxyUrl;
    if (this.config.enabled) return; // Already enabled with a URL
    this.config.enabled = true;
    this.setupInterceptors();
    logService.info(`[ProxyInterceptor] Enabled with proxy URL: ${proxyUrl}`);
  }

  disable(): void {
    if (!this.config.enabled) return;
    this.config.enabled = false;
    this.restoreOriginalFunctions();
    logService.info('[ProxyInterceptor] Disabled.');
  }

  private shouldProxy(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return this.config.enabled && urlObj.hostname === this.config.originalDomain;
    } catch (e) {
        return this.config.enabled && url.includes(this.config.originalDomain);
    }
  }

  private transformUrl(url: string): string {
    if (!this.shouldProxy(url)) return url;
    
    const originalBase = `https://${this.config.originalDomain}/v1beta`;
    const transformedUrl = url.replace(originalBase, this.config.proxyUrl);
    
    logService.info(`[ProxyInterceptor] Redirecting: ${url} -> ${transformedUrl}`);
    return transformedUrl;
  }

  private setupInterceptors(): void {
    this.setupFetchInterceptor();
    this.setupXHRInterceptor();
  }

  private setupFetchInterceptor(): void {
    const self = this;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const proxyUrl = self.transformUrl(url);
      
      const newInput = (url === proxyUrl) ? input : (typeof input === 'string' ? proxyUrl : new Request(proxyUrl, input as Request));
      return self.originalFetch(newInput, init);
    };
  }

  private setupXHRInterceptor(): void {
    const self = this;
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      const urlString = typeof url === 'string' ? url : url.href;
      const proxyUrl = self.transformUrl(urlString);
      
      return self.originalXHROpen.call(this, method, proxyUrl, ...args);
    };
  }

  private restoreOriginalFunctions(): void {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
  }
}

export const proxyInterceptor = new ProxyInterceptor();

export const initializeProxyInterceptor = (): void => {
  try {
    const settingsJSON = localStorage.getItem('chatAppSettings');
    if (settingsJSON) {
      const settings = JSON.parse(settingsJSON);
      if (settings.useCustomApiConfig && settings.apiProxyUrl) {
        const proxyUrl = settings.apiProxyUrl.trim().replace(/\/$/, ''); // Remove trailing slash
        proxyInterceptor.enable(proxyUrl);
      } else {
        proxyInterceptor.disable();
      }
    }
  } catch (error) {
    logService.error('[ProxyInterceptor] Initialization failed:', error);
  }
};
