
import { useState, useEffect, useCallback } from 'react';
import { ModelOption, AppSettings } from '../types';
import { geminiServiceInstance } from '../services/geminiService';
import { TAB_CYCLE_MODELS, STATIC_TTS_MODELS, STATIC_IMAGEN_MODELS } from '../constants/appConstants';
import { getActiveApiConfig, logService, sortModels } from '../utils/appUtils';

const getPinnedModels = (): ModelOption[] => {
    const pinnedInternalModels: ModelOption[] = TAB_CYCLE_MODELS.map(id => {
        const name = id.includes('/') 
            ? `Gemini ${id.split('/')[1]}`.replace('gemini-','').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            : `Gemini ${id.replace('gemini-','').replace(/-/g, ' ')}`.replace(/\b\w/g, l => l.toUpperCase());
        return { id, name, isPinned: true };
    });
    return [...pinnedInternalModels, ...STATIC_TTS_MODELS, ...STATIC_IMAGEN_MODELS];
};

export const useModels = (appSettings: AppSettings) => {
    const [apiModels, setApiModels] = useState<ModelOption[]>(getPinnedModels());
    const [modelsLoadingError, setModelsLoadingError] = useState<string | null>(null);
    const [isModelsLoading, setIsModelsLoading] = useState<boolean>(false);

    const { useCustomApiConfig, apiKey, useApiProxy, apiProxyUrl } = appSettings;

    const fetchAndSetModels = useCallback(async () => {
        setIsModelsLoading(true);
        setModelsLoadingError(null);
        
        const { apiKeysString, baseUrl } = getActiveApiConfig({ ...appSettings, apiKey, useCustomApiConfig, useApiProxy, apiProxyUrl });

        const pinnedModels = getPinnedModels();
        
        let modelsFromApi: ModelOption[] = [];
        try {
            modelsFromApi = await geminiServiceInstance.getAvailableModels(apiKeysString, baseUrl);
        } catch (error) {
            logService.warn(`API model fetch failed: ${error instanceof Error ? error.message : String(error)}. Using pinned models as fallback.`);
        }

        const modelMap = new Map<string, ModelOption>();
        
        modelsFromApi.forEach(model => {
            if (!modelMap.has(model.id)) {
                modelMap.set(model.id, { ...model, isPinned: false });
            }
        });

        pinnedModels.forEach(pinnedModel => {
            modelMap.set(pinnedModel.id, pinnedModel);
        });

        const finalModels = sortModels(Array.from(modelMap.values()));
        
        setApiModels(finalModels);

        if (finalModels.length === 0 && !modelsLoadingError) {
            setModelsLoadingError('No models available to select.');
        }
        setIsModelsLoading(false);
    }, [useCustomApiConfig, apiKey, useApiProxy, apiProxyUrl, modelsLoadingError]);

    useEffect(() => {
        fetchAndSetModels();
    }, [fetchAndSetModels]);

    useEffect(() => {
        const handleOnline = () => {
            setModelsLoadingError(currentError => {
                if (currentError && (currentError.toLowerCase().includes('network') || currentError.toLowerCase().includes('fetch'))) {
                    fetchAndSetModels();
                    return null;
                }
                return currentError;
            });
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [fetchAndSetModels]);

    return { apiModels, isModelsLoading, modelsLoadingError, setApiModels };
};
