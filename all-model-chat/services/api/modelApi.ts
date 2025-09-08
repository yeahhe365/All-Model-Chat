import { getClient } from './baseApi';
import { ModelOption } from '../../types';
import { logService } from "../logService";
import { dbService } from '../../utils/db';

export const getAvailableModelsApi = async (apiKeysString: string | null): Promise<ModelOption[]> => {
    logService.info('🔄 [ModelAPI] Fetching available models...');
    const keys = (apiKeysString || '').split('\n').map(k => k.trim()).filter(Boolean);

    if (keys.length === 0) {
        logService.warn('getAvailableModels called with no API keys.');
        throw new Error("API client not initialized. Configure API Key in settings.");
    }
    
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    logService.info(`🔑 [ModelAPI] Using API key: ${randomKey.substring(0, 10)}...`);
    
    // The logic now relies on the globally patched fetch provided by proxyInterceptor.ts
    // if the proxy settings are enabled.
    try {
        // Get proxy URL from localStorage if available
        const settings = await dbService.getAppSettings();
        const useApiProxy = settings?.useCustomApiConfig && settings?.useApiProxy;
        const apiProxyUrl = useApiProxy ? settings?.apiProxyUrl : null;
        
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
            logService.info(`Fetched ${availableModels.length} models successfully via SDK.`);
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