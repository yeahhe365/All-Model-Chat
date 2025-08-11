/**
 * 增强版代理拦截器
 * 自动拦截所有网络请求并重定向到代理服务器
 */

interface ProxyConfig {
  enabled: boolean;
  proxyUrl: string;          // 期望形如 https://your-proxy/...（可带或不带 /v1beta）
  originalDomain: string;    // 默认 generativelanguage.googleapis.com
}

class ProxyInterceptor {
  private config: ProxyConfig;
  private originalFetch: typeof window.fetch;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private originalEventSource: typeof window.EventSource;
  private originalWebSocket: typeof window.WebSocket;
  private originalSendBeacon: typeof navigator.sendBeacon | null;

  constructor() {
    this.config = {
      enabled: false,
      proxyUrl: 'https://api-proxy.me/gemini/v1beta',
      originalDomain: 'generativelanguage.googleapis.com',
    };

    // 保存原始函数引用，并绑定正确的上下文
    this.originalFetch = window.fetch.bind(window);
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalEventSource = window.EventSource;
    this.originalWebSocket = window.WebSocket;
    this.originalSendBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
  }

  /** 启用代理拦截器 */
  enable(proxyUrl?: string): void {
    if (proxyUrl) this.config.proxyUrl = proxyUrl;
    this.config.enabled = true;
    this.setupInterceptors();
    console.log('🔧 [ProxyInterceptor] 增强版代理拦截器已启用');
  }

  /** 禁用代理拦截器 */
  disable(): void {
    this.config.enabled = false;
    this.restoreOriginalFunctions();
    console.log('🔧 [ProxyInterceptor] 代理拦截器已禁用');
  }

  /** 是否需要代理 */
  private shouldProxy(url: string): boolean {
    return this.config.enabled && url.includes(this.config.originalDomain);
  }

  /** 将 Google API URL 智能转换为代理 URL（同时支持 /v1beta 与 /upload/v1beta） */
  private transformUrl(url: string): string {
    if (!this.shouldProxy(url)) return url;

    const origin = this.config.originalDomain;
    const apiPrefix = `https://${origin}/v1beta`;
    const uploadPrefix = `https://${origin}/upload/v1beta`;

    // 统一 & 拆分 proxy 基础路径
    let proxyBase = this.config.proxyUrl.trim().replace(/\/+$/, '');
    const baseRoot = proxyBase.replace(/\/v1(beta)?$/i, ''); // 去掉可能已有的 /v1 或 /v1beta

    // 目标前缀：
    const proxyApiBase = /\/v1(beta)?$/i.test(proxyBase) ? proxyBase : `${baseRoot}/v1beta`;
    const proxyUploadBase = `${baseRoot}/upload/v1beta`;

    let transformed = url;
    if (url.startsWith(uploadPrefix)) {
      transformed = url.replace(uploadPrefix, proxyUploadBase);
    } else if (url.startsWith(apiPrefix)) {
      transformed = url.replace(apiPrefix, proxyApiBase);
    }

    console.log('🔄 [ProxyInterceptor] 代理请求:', url, '->', transformed);
    return transformed;
  }

  /** 设置所有拦截器 */
  private setupInterceptors(): void {
    this.setupFetchInterceptor();
    this.setupXHRInterceptor();
    this.setupEventSourceInterceptor();
    this.setupWebSocketInterceptor();
    this.setupSendBeaconInterceptor();
  }

  /** 拦截 fetch */
  private setupFetchInterceptor(): void {
    const self = this;
    const originalFetch = this.originalFetch;

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      if (self.shouldProxy(url)) {
        const proxiedUrl = self.transformUrl(url);
        const newInput =
          typeof input === 'string' ? proxiedUrl : input instanceof URL ? new URL(proxiedUrl) : new Request(proxiedUrl, input);
        return originalFetch(newInput, init);
      }

      return originalFetch(input, init);
    };
  }

  /** 拦截 XHR */
  private setupXHRInterceptor(): void {
    const self = this;
    const originalOpen = this.originalXHROpen;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
      const urlString = typeof url === 'string' ? url : url.href;

      if (self.shouldProxy(urlString)) {
        const proxyUrl = self.transformUrl(urlString);
        return originalOpen.call(this, method, proxyUrl, ...args);
      }

      return originalOpen.call(this, method, url, ...args);
    };
  }

  /** 拦截 EventSource（SSE） */
  private setupEventSourceInterceptor(): void {
    const self = this;
    const OriginalEventSource = this.originalEventSource;

    window.EventSource = function (this: EventSource, url: string | URL, eventSourceInitDict?: EventSourceInit) {
      const urlString = typeof url === 'string' ? url : url.href;
      const proxyUrl = self.shouldProxy(urlString) ? self.transformUrl(urlString) : urlString;
      return new OriginalEventSource(proxyUrl, eventSourceInitDict);
    } as any;

    // 保持原型链
    window.EventSource.prototype = OriginalEventSource.prototype;
  }

  /** 拦截 WebSocket（只需处理 /v1beta） */
  private setupWebSocketInterceptor(): void {
    const self = this;
    const OriginalWebSocket = this.originalWebSocket;

    window.WebSocket = function (this: WebSocket, url: string | URL, protocols?: string | string[]) {
      const urlString = typeof url === 'string' ? url : url.href;
      let proxyUrl = urlString;

      if (self.shouldProxy(urlString)) {
        // 代理端一般是 https -> wss / http -> ws
        const base = self.config.proxyUrl.trim().replace(/\/+$/, '');
        const baseRoot = base.replace(/\/v1(beta)?$/i, '');
        const wsApiBase = `${baseRoot}/v1beta`; // WS 不涉及 upload 前缀

        proxyUrl = urlString
          .replace(`wss://${self.config.originalDomain}/v1beta`, wsApiBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:'))
          .replace(`ws://${self.config.originalDomain}/v1beta`, wsApiBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:'));

        console.log('🔄 [ProxyInterceptor] WebSocket代理:', urlString, '->', proxyUrl);
      }

      return new OriginalWebSocket(proxyUrl, protocols);
    } as any;

    // 保持原型链
    window.WebSocket.prototype = OriginalWebSocket.prototype;
  }

  /** 拦截 sendBeacon */
  private setupSendBeaconInterceptor(): void {
    if (!this.originalSendBeacon) return;

    const self = this;
    const originalSendBeacon = this.originalSendBeacon;

    navigator.sendBeacon = function (url: string | URL, data?: BodyInit | null): boolean {
      const urlString = typeof url === 'string' ? url : url.href;
      const proxyUrl = self.shouldProxy(urlString) ? self.transformUrl(urlString) : urlString;
      return originalSendBeacon(proxyUrl, data);
    };
  }

  /** 恢复原始函数 */
  private restoreOriginalFunctions(): void {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    window.EventSource = this.originalEventSource;
    window.WebSocket = this.originalWebSocket;
    if (this.originalSendBeacon) navigator.sendBeacon = this.originalSendBeacon;
  }

  getConfig(): ProxyConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ProxyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.config.enabled) this.setupInterceptors();
  }
}

/** 检测代理类型（用于日志展示） */
const detectProxyType = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('api-proxy.me')) return 'API-Proxy.me';
  if (lowerUrl.includes('openai-proxy')) return 'OpenAI Proxy';
  if (lowerUrl.includes('ai-proxy')) return 'AI Proxy';
  if (lowerUrl.includes('gemini-proxy')) return 'Gemini Proxy';
  if (lowerUrl.includes('google-proxy')) return 'Google Proxy';
  if (lowerUrl.includes('cloudflare') || lowerUrl.includes('workers.dev')) return 'Cloudflare Workers';
  if (lowerUrl.includes('vercel.app')) return 'Vercel';
  if (lowerUrl.includes('netlify.app')) return 'Netlify';
  if (lowerUrl.includes('herokuapp.com')) return 'Heroku';
  if (lowerUrl.includes('railway.app')) return 'Railway';
  if (lowerUrl.includes('render.com')) return 'Render';
  if (lowerUrl.includes('fly.io')) return 'Fly.io';
  if (lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1')) return 'Local Proxy';
  return 'Custom Proxy';
};

// 创建全局实例
export const proxyInterceptor = new ProxyInterceptor();

/** 自动初始化：从 chatAppSettings 读取并启用（保持你原来的智能拼接逻辑） */
export const initializeProxyInterceptor = (): void => {
  try {
    const settings = localStorage.getItem('chatAppSettings'); // ✅ 正确键
    if (settings) {
      const appSettings = JSON.parse(settings);
      if (appSettings.useCustomApiConfig && appSettings.apiProxyUrl) {
        // 智能处理代理URL格式
        let proxyUrl: string = String(appSettings.apiProxyUrl).trim();
        proxyUrl = proxyUrl.replace(/\/+$/, ''); // 去尾斜杠

        if (!/\/v1(beta)?$/i.test(proxyUrl)) {
          if (proxyUrl.includes('/v1beta/') || proxyUrl.includes('/v1/') || proxyUrl.includes('/api/')) {
            console.log('🔍 [ProxyInterceptor] 检测到完整API路径，直接使用');
          } else {
            if (proxyUrl.includes('api-proxy.me')) {
              if (!proxyUrl.endsWith('/gemini')) proxyUrl += '/gemini';
              proxyUrl += '/v1beta';
            } else {
              // 通用：补上 v1beta
              proxyUrl += '/v1beta';
            }
          }
        }

        proxyInterceptor.enable(proxyUrl);
        console.log('✅ [ProxyInterceptor] 自动启用代理拦截器');
        console.log('📍 [ProxyInterceptor] 原始URL:', appSettings.apiProxyUrl);
        console.log('🎯 [ProxyInterceptor] 处理后URL:', proxyUrl);
        console.log('🔧 [ProxyInterceptor] 代理类型:', detectProxyType(appSettings.apiProxyUrl));
      }
    }
  } catch (error) {
    console.error('❌ [ProxyInterceptor] 初始化失败:', error);
  }
};

export type { ProxyConfig };
