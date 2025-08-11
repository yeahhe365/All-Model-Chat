import { getClient } from './baseApi';
import { ModelOption } from '../../types';
import { logService } from "../logService";

export const getAvailableModelsApi = async (apiKeysString: string | null): Promise<ModelOption[]> => {
    logService.info('Fetching available models...');
    const keys = (apiKeysString || '').split('\n').map(k => k.trim()).filter(Boolean);

    if (keys.length === 0) {
        logService.warn('getAvailableModels called with no API keys.');
        throw new Error("API client not initialized. Configure API Key in settings.");
    }
    
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const ai = getClient(randomKey);

    try {
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
        logService.info(`Fetched ${availableModels.length} models successfully.`);
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
