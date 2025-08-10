import { getClient } from './baseApi';
import { ModelOption } from '../../types';
import { logService } from "../logService";
import { proxyService } from '../proxyService';

export const getAvailableModelsApi = async (apiKeysString: string | null): Promise<ModelOption[]> => {
    logService.info('🔄 [ModelAPI] Fetching available models...');
    const keys = (apiKeysString || '').split('\n').map(k => k.trim()).filter(Boolean);

    if (keys.length === 0) {
        logService.warn('getAvailableModels called with no API keys.');
        throw new Error("API client not initialized. Configure API Key in settings.");
    }
    
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    logService.info(`🔑 [ModelAPI] Using API key: ${randomKey.substring(0, 10)}...`);
    
    // 检查是否启用了自定义 API 配置
    const storedSettings = localStorage.getItem('app-settings');
    const settings = storedSettings ? JSON.parse(storedSettings) : {};
    const useCustomApiConfig = settings.useCustomApiConfig;
    const apiProxyUrl = settings.apiProxyUrl;
    
    logService.info('⚙️ [ModelAPI] Settings check:', {
        useCustomApiConfig,
        apiProxyUrl,
        hasSettings: !!storedSettings,
        settingsKeys: Object.keys(settings)
    });
    
    // 如果启用了自定义配置且有代理 URL，强制使用代理服务
    if (useCustomApiConfig && apiProxyUrl) {
        try {
            logService.info('🔄 Attempting to fetch models via proxy service...');
            const response = await proxyService.getModels(randomKey);
            
            if (response && response.models) {
                const availableModels: ModelOption[] = [];
                
                for (const model of response.models) {
                    const supported = model.supportedActions;
                    if (!supported || supported.includes('generateContent') || supported.includes('generateImages')) {
                        availableModels.push({
                            id: model.name,
                            name: model.displayName || model.name.split('/').pop() || model.name,
                            isPinned: false,
                        });
                    }
                }

                if (availableModels.length > 0) {
                    logService.info(`✅ Fetched ${availableModels.length} models successfully via proxy.`);
                    return availableModels.sort((a,b) => a.name.localeCompare(b.name));
                } else {
                    logService.warn('Proxy returned empty model list');
                }
            } else {
                logService.warn('Proxy returned invalid response format');
            }
        } catch (proxyError) {
            logService.error('❌ Proxy service failed:', proxyError);
            // 如果启用了代理但失败了，不要回退，直接抛出错误
            throw new Error(`Proxy service failed: ${proxyError.message}`);
        }
    } else {
        logService.info('Custom API config not enabled or no proxy URL, using direct API');
    }

    // 回退到原始的 GoogleGenAI SDK 方法
    try {
        // Get proxy URL from localStorage if available
        const storedSettings = localStorage.getItem('app-settings');
        const apiProxyUrl = storedSettings ? JSON.parse(storedSettings).apiProxyUrl : null;
        const ai = getClient(randomKey, apiProxyUrl);

        const modelPager = await ai.models.list();
        const availableModels: ModelOption[] = [];
        for await (const model of modelPager) {
            const supported = model.supportedActions;
            if (!supported || supported.includes('generateContent') || supported.includes('generateImages')) {
                availableModels.push({
                    id: model.name,
                    name: model.displayName || model.name.split('/').pop() || model.name,
                    isPinned: false,
                });
            }
        }

        if (availableModels.length > 0) {
            logService.info(`Fetched ${availableModels.length} models successfully via SDK fallback.`);
            return availableModels.sort((a,b) => a.name.localeCompare(b.name));
        } else {
            // If the API returns an empty list, treat it as an error so fallbacks are used.
            logService.warn("API returned an empty list of models.");
            throw new Error("API returned an empty list of models.");
        }
    } catch (error) {
        logService.error("Failed to fetch available models from Gemini API:", error);
        // Re-throw the error for the caller to handle and provide fallbacks.
        throw error;
    }
};
