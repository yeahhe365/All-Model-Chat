// 代理服务 - 完全替换 GoogleGenAI SDK 的网络请求
import { logService } from "./logService";

interface ProxyConfig {
    apiKey: string;
    proxyUrl?: string;
}

class ProxyService {
    private getEffectiveUrl(originalUrl: string, proxyUrl?: string): string {
        if (!proxyUrl) return originalUrl;
        
        // 替换 Google API 的基础 URL
        const googleApiBase = 'https://generativelanguage.googleapis.com/v1beta';
        if (originalUrl.startsWith(googleApiBase)) {
            const path = originalUrl.substring(googleApiBase.length);
            // 确保代理 URL 以 /v1beta 结尾
            const normalizedProxyUrl = proxyUrl.endsWith('/v1beta') ? proxyUrl : proxyUrl + '/v1beta';
            const finalUrl = normalizedProxyUrl + path;
            logService.info(`Proxying request: ${originalUrl} -> ${finalUrl}`);
            return finalUrl;
        }
        
        return originalUrl;
    }

    private getStoredProxyUrl(): string | null {
        try {
            const settings = localStorage.getItem('app-settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                return parsed.apiProxyUrl || null;
            }
        } catch (error) {
            logService.error('Failed to get proxy URL from settings:', error);
        }
        return null;
    }

    async makeRequest(url: string, options: RequestInit, config: ProxyConfig): Promise<Response> {
        const proxyUrl = config.proxyUrl || this.getStoredProxyUrl();
        const effectiveUrl = this.getEffectiveUrl(url, proxyUrl);
        
        // 确保请求头包含 API Key
        const headers = new Headers(options.headers);
        
        // 对于 Google API，API Key 通常作为查询参数
        const urlObj = new URL(effectiveUrl);
        if (config.apiKey && !urlObj.searchParams.has('key')) {
            urlObj.searchParams.set('key', config.apiKey);
        }
        
        logService.info(`Making proxied request to: ${urlObj.toString()}`);
        
        return fetch(urlObj.toString(), {
            ...options,
            headers,
            mode: 'cors',
            credentials: 'omit'
        });
    }

    // 专门用于模型列表请求
    async getModels(apiKey: string): Promise<any> {
        const proxyUrl = this.getStoredProxyUrl();
        const url = 'https://generativelanguage.googleapis.com/v1beta/models';
        
        logService.info('🚀 [ProxyService] getModels called', {
            apiKey: apiKey.substring(0, 10) + '...',
            proxyUrl,
            originalUrl: url
        });
        
        try {
            const response = await this.makeRequest(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, { apiKey, proxyUrl });

            logService.info('📥 [ProxyService] Response received', {
                status: response.status,
                url: response.url
            });

            if (!response.ok) {
                const errorText = await response.text();
                logService.error('❌ [ProxyService] Request failed', {
                    status: response.status,
                    error: errorText
                });
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            logService.info('✅ [ProxyService] Models fetched successfully', {
                modelCount: data.models ? data.models.length : 0
            });
            return data;
        } catch (error) {
            logService.error('❌ [ProxyService] Failed to fetch models via proxy:', error);
            throw error;
        }
    }

    // 专门用于聊天请求
    async generateContent(apiKey: string, modelId: string, payload: any): Promise<any> {
        const proxyUrl = this.getStoredProxyUrl();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
        
        try {
            const response = await this.makeRequest(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }, { apiKey, proxyUrl });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            logService.error('Failed to generate content via proxy:', error);
            throw error;
        }
    }

    // 流式聊天请求
    async generateContentStream(apiKey: string, modelId: string, payload: any): Promise<ReadableStream> {
        const proxyUrl = this.getStoredProxyUrl();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent`;
        
        try {
            const response = await this.makeRequest(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }, { apiKey, proxyUrl });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return response.body!;
        } catch (error) {
            logService.error('Failed to generate content stream via proxy:', error);
            throw error;
        }
    }
}

export const proxyService = new ProxyService();