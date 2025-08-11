/**
 * 增强版代理拦截器
 * 自动拦截所有网络请求并重定向到代理服务器
 */

interface ProxyConfig {
  enabled: boolean;
  proxyUrl: string;
  originalDomain: string;
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
      originalDomain: 'generativelanguage.googleapis.com'
    };

    // 保存原始函数引用，并绑定正确的上下文
    this.originalFetch = window.fetch.bind(window);
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalEventSource = window.EventSource;
    this.originalWebSocket = window.WebSocket;
    this.originalSendBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
  }

  /**
   * 启用代理拦截器
   */
  enable(proxyUrl?: string): void {
    if (proxyUrl) {
      this.config.proxyUrl = proxyUrl;
    }
    
    this.config.enabled = true;
    this.setupInterceptors();
    console.log('🔧 [ProxyInterceptor] 增强版代理拦截器已启用');
  }

  /**
   * 禁用代理拦截器
   */
  disable(): void {
    this.config.enabled = false;
    this.restoreOriginalFunctions();
    console.log('🔧 [ProxyInterceptor] 代理拦截器已禁用');
  }

  /**
   * 检查是否需要代理的URL
   */
  private shouldProxy(url: string): boolean {
    return this.config.enabled && url.includes(this.config.originalDomain);
  }

  /**
   * 智能转换URL为代理URL
   */
  private transformUrl(url: string): string {
    if (!this.shouldProxy(url)) return url;
    
    // 智能处理不同格式的代理URL
    let proxyUrl = this.config.proxyUrl;
    
    // 确保代理URL以正确的格式结尾
    if (!proxyUrl.endsWith('/v1beta')) {
      // 移除可能的尾部斜杠
      proxyUrl = proxyUrl.replace(/\/$/, '');
      // 添加正确的API版本路径
      if (!proxyUrl.endsWith('/gemini')) {
        proxyUrl += '/gemini';
      }
      proxyUrl += '/v1beta';
    }
    
    // 为不同的 API 端点定义前缀
    const uploadPrefix = `https://upload.${this.config.originalDomain}/upload/v1beta`;
    const standardPrefix = `https://${this.config.originalDomain}/v1beta`;
    
    let transformedUrl = url;

    // 根据 URL 的前缀执行相应的替换
    if (url.startsWith(uploadPrefix)) {
        transformedUrl = url.replace(uploadPrefix, proxyUrl);
        console.log('🔄 [ProxyInterceptor] 代理文件上传请求:', url, '->', transformedUrl);
    } else if (url.startsWith(standardPrefix)) {
        transformedUrl = url.replace(standardPrefix, proxyUrl);
        console.log('🔄 [ProxyInterceptor] 代理常规请求:', url, '->', transformedUrl);
    } else {
        console.warn('⚠️ [ProxyInterceptor] URL 应被代理但未应用转换规则:', url);
    }
    
    return transformedUrl;
  }

  /**
   * 设置所有拦截器
   */
  private setupInterceptors(): void {
    this.setupFetchInterceptor();
    this.setupXHRInterceptor();
    this.setupEventSourceInterceptor();
    this.setupWebSocketInterceptor();
    this.setupSendBeaconInterceptor();
  }

  /**
   * 拦截 fetch 请求
   */
  private setupFetchInterceptor(): void {
    const self = this;
    const originalFetch = this.originalFetch;
    
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (self.shouldProxy(url)) {
        const proxyUrl = self.transformUrl(url);
        const newInput = typeof input === 'string' 
          ? proxyUrl 
          : input instanceof URL 
            ? new URL(proxyUrl)
            : new Request(proxyUrl, input);
        return originalFetch(newInput, init);
      }
      
      return originalFetch(input, init);
    };
  }

  /**
   * 拦截 XMLHttpRequest 请求
   */
  private setupXHRInterceptor(): void {
    const self = this;
    const originalOpen = this.originalXHROpen;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      const urlString = typeof url === 'string' ? url : url.href;
      
      if (self.shouldProxy(urlString)) {
        const proxyUrl = self.transformUrl(urlString);
        return originalOpen.call(this, method, proxyUrl, ...args);
      }
      
      return originalOpen.call(this, method, url, ...args);
    };
  }

  /**
   * 拦截 EventSource 请求（SSE流式请求）
   */
  private setupEventSourceInterceptor(): void {
    const self = this;
    const OriginalEventSource = this.originalEventSource;
    
    window.EventSource = function(this: EventSource, url: string | URL, eventSourceInitDict?: EventSourceInit) {
      const urlString = typeof url === 'string' ? url : url.href;
      const proxyUrl = self.shouldProxy(urlString) ? self.transformUrl(urlString) : urlString;
      return new OriginalEventSource(proxyUrl, eventSourceInitDict);
    } as any;
    
    // 保持原型链
    window.EventSource.prototype = OriginalEventSource.prototype;
  }

  /**
   * 拦截 WebSocket 连接
   */
  private setupWebSocketInterceptor(): void {
    const self = this;
    const OriginalWebSocket = this.originalWebSocket;
    
    window.WebSocket = function(this: WebSocket, url: string | URL, protocols?: string | string[]) {
      const urlString = typeof url === 'string' ? url : url.href;
      let proxyUrl = urlString;
      
      if (self.shouldProxy(urlString)) {
        proxyUrl = urlString
          .replace(`wss://${self.config.originalDomain}/v1beta`, self.config.proxyUrl.replace('https:', 'wss:'))
          .replace(`ws://${self.config.originalDomain}/v1beta`, self.config.proxyUrl.replace('https:', 'ws:'));
        console.log('🔄 [ProxyInterceptor] WebSocket代理:', urlString, '->', proxyUrl);
      }
      
      return new OriginalWebSocket(proxyUrl, protocols);
    } as any;
    
    // 保持原型链
    window.WebSocket.prototype = OriginalWebSocket.prototype;
  }

  /**
   * 拦截 navigator.sendBeacon 请求
   */
  private setupSendBeaconInterceptor(): void {
    if (!this.originalSendBeacon) return;
    
    const self = this;
    const originalSendBeacon = this.originalSendBeacon;
    
    navigator.sendBeacon = function(url: string | URL, data?: BodyInit | null): boolean {
      const urlString = typeof url === 'string' ? url : url.href;
      const proxyUrl = self.shouldProxy(urlString) ? self.transformUrl(urlString) : urlString;
      return originalSendBeacon(proxyUrl, data);
    };
  }

  /**
   * 恢复原始函数
   */
  private restoreOriginalFunctions(): void {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    window.EventSource = this.originalEventSource;
    window.WebSocket = this.originalWebSocket;
    if (this.originalSendBeacon) {
      navigator.sendBeacon = this.originalSendBeacon;
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ProxyConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ProxyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled) {
      this.setupInterceptors();
    }
  }
}

/**
 * 检测代理类型
 */
const detectProxyType = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('api-proxy.me')) return 'API-Proxy.me';
  if (lowerUrl.includes('openai-proxy')) return 'OpenAI Proxy';
  if (lowerUrl.includes('ai-proxy')) return 'AI Proxy';
  if (lowerUrl.includes('gemini-proxy')) return 'Gemini Proxy';
  if (lowerUrl.includes('google-proxy')) return 'Google Proxy';
  if (lowerUrl.includes('cloudflare')) return 'Cloudflare Workers';
  if (lowerUrl.includes('workers.dev')) return 'Cloudflare Workers';
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

// 自动初始化函数
export const initializeProxyInterceptor = (): void => {
  try {
    // 从localStorage读取设置
    const settings = localStorage.getItem('chatAppSettings');
    if (settings) {
      const appSettings = JSON.parse(settings);
      
      // 如果启用了自定义API配置且有代理URL，则启用拦截器
      if (appSettings.useCustomApiConfig && appSettings.apiProxyUrl) {
        // 智能处理代理URL格式
        let proxyUrl = appSettings.apiProxyUrl.trim();
        
        // 移除尾部斜杠
        proxyUrl = proxyUrl.replace(/\/$/, '');
        
        // 智能路径处理 - 支持各种代理服务格式
        if (!proxyUrl.endsWith('/v1beta')) {
          // 检查是否已经是完整的API路径
          if (proxyUrl.includes('/v1beta/') || proxyUrl.includes('/v1/') || proxyUrl.includes('/api/')) {
            // 如果已包含API路径，直接使用
            console.log('🔍 [ProxyInterceptor] 检测到完整API路径，直接使用');
          } else {
            // 根据不同代理服务的特征进行智能处理
            if (proxyUrl.includes('api-proxy.me')) {
              // api-proxy.me 格式
              if (!proxyUrl.endsWith('/gemini')) {
                proxyUrl += '/gemini';
              }
              proxyUrl += '/v1beta';
            } else if (proxyUrl.includes('openai-proxy') || proxyUrl.includes('ai-proxy')) {
              // OpenAI代理格式，通常直接添加v1beta
              proxyUrl += '/v1beta';
            } else if (proxyUrl.includes('gemini-proxy') || proxyUrl.includes('google-proxy')) {
              // Google/Gemini专用代理
              proxyUrl += '/v1beta';
            } else if (proxyUrl.includes('cloudflare') || proxyUrl.includes('workers')) {
              // Cloudflare Workers代理
              proxyUrl += '/v1beta';
            } else if (proxyUrl.includes('vercel') || proxyUrl.includes('netlify')) {
              // Vercel/Netlify代理
              proxyUrl += '/v1beta';
            } else {
              // 通用代理格式 - 尝试智能判断
              if (proxyUrl.split('/').length <= 3) {
                // 基础域名，添加标准路径
                proxyUrl += '/v1beta';
              } else {
                // 已有路径，只添加版本号
                if (!proxyUrl.includes('v1')) {
                  proxyUrl += '/v1beta';
                }
              }
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

// 导出类型
export type { ProxyConfig };