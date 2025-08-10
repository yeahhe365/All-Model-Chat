// services/proxyService.ts
import { logService } from "./logService";

interface ProxyConfig {
    apiKey: string;
    proxyUrl?: string;
}

class ProxyService {
    private getEffectiveUrl(originalUrl: string, proxyUrl?: string): string {
        if (!proxyUrl) return originalUrl;
        
        const googleApiBase = 'https://generativelanguage.googleapis.com/v1beta';
        if (originalUrl.startsWith(googleApiBase)) {
            const path = originalUrl.substring(googleApiBase.length);
            const normalizedProxyUrl = proxyUrl.endsWith('/v1beta') ? proxyUrl : (proxyUrl.replace(/\/$/, '') + '/v1beta');
            const finalUrl = normalizedProxyUrl + path;
            logService.info(`Proxying request: ${originalUrl} -> ${finalUrl}`);
            return finalUrl;
        }
        
        return originalUrl;
    }

    private getStoredProxyUrl(): string | null {
        try {
            const settings = localStorage.getItem('chatAppSettings');
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
        
        const headers = new Headers(options.headers);
        
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

    async getModels(apiKey: string): Promise<any> {
        const proxyUrl = this.getStoredProxyUrl();
        if (!proxyUrl) {
            throw new Error("Proxy URL is not configured but proxy service was called.");
        }
        const url = 'https://generativelanguage.googleapis.com/v1beta/models';
        
        logService.info('🚀 [ProxyService] getModels called', {
            apiKey: apiKey.substring(0, 4) + '...',
            proxyUrl,
        });
        
        try {
            const response = await this.makeRequest(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }, { apiKey, proxyUrl });

            if (!response.ok) {
                const errorText = await response.text();
                logService.error('❌ [ProxyService] Request failed', { status: response.status, error: errorText });
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            logService.info('✅ [ProxyService] Models fetched successfully', { modelCount: data.models ? data.models.length : 0 });
            return data;
        } catch (error) {
            logService.error('❌ [ProxyService] Failed to fetch models via proxy:', error);
            throw error;
        }
    }
}

export const proxyService = new ProxyService();
