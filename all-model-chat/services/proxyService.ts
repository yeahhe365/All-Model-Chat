import { logService } from "./logService";

class ProxyService {
    private getProxyAndKey(): { proxyUrl: string | null; apiKey: string | null } {
        try {
            const settingsString = localStorage.getItem('chatAppSettings');
            if (settingsString) {
                const settings = JSON.parse(settingsString);
                return {
                    proxyUrl: settings.useCustomApiConfig ? (settings.apiProxyUrl || null) : null,
                    apiKey: settings.useCustomApiConfig ? (settings.apiKey || null) : (process.env.API_KEY || null),
                };
            }
        } catch (error) {
            logService.error("Failed to get proxy/key from settings", { error });
        }
        return { proxyUrl: null, apiKey: process.env.API_KEY || null };
    }

    private transformUrl(originalUrl: string, proxyUrl: string | null): string {
        if (!proxyUrl) {
            return originalUrl;
        }
        const googleApiBase = 'https://generativelanguage.googleapis.com';
        if (originalUrl.startsWith(googleApiBase)) {
            const path = originalUrl.substring(googleApiBase.length);
            const finalUrl = proxyUrl.replace(/\/$/, '') + path;
            logService.debug(`[ProxyService] Transforming URL: ${originalUrl} -> ${finalUrl}`);
            return finalUrl;
        }
        return originalUrl;
    }

    private async makeRequest(url: string, options: RequestInit): Promise<Response> {
        const { proxyUrl, apiKey } = this.getProxyAndKey();
        if (!apiKey) {
            throw new Error("[ProxyService] API Key not found for request.");
        }

        const transformedUrl = this.transformUrl(url, proxyUrl);
        
        const urlObj = new URL(transformedUrl);
        // Use only the first key if multiple are provided
        const firstApiKey = apiKey.split('\n')[0].trim();
        if (!urlObj.searchParams.has('key')) {
            urlObj.searchParams.set('key', firstApiKey);
        }

        const finalOptions: RequestInit = {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
            },
            mode: 'cors',
        };

        const response = await fetch(urlObj.toString(), finalOptions);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`[ProxyService] Request failed with status ${response.status}: ${errorBody}`);
        }
        return response;
    }

    public async getModels(): Promise<any> {
        return this.makeRequest(
            'https://generativelanguage.googleapis.com/v1beta/models', 
            { method: 'GET' }
        ).then(res => res.json());
    }

    public async generateContent(modelId: string, payload: any): Promise<any> {
        return this.makeRequest(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
            { method: 'POST', body: JSON.stringify(payload) }
        ).then(res => res.json());
    }

    public async generateContentStream(modelId: string, payload: any): Promise<ReadableStream | null> {
        const response = await this.makeRequest(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent`,
            { method: 'POST', body: JSON.stringify(payload) }
        );
        return response.body;
    }
}

export const proxyService = new ProxyService();
