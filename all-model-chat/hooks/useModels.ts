import { useState, useEffect, useCallback } from 'react';
import { ModelOption, AppSettings } from '../types';
import { geminiServiceInstance } from '../services/geminiService';
import { TAB_CYCLE_MODELS } from '../constants/appConstants';
import { getActiveApiConfig } from '../utils/appUtils';

export const useModels = (appSettings: AppSettings) => {
    const [apiModels, setApiModels] = useState<ModelOption[]>([]);
    const [modelsLoadingError, setModelsLoadingError] = useState<string | null>(null);
    const [isModelsLoading, setIsModelsLoading] = useState<boolean>(true);

    const { useCustomApiConfig, apiKey } = appSettings;

    const fetchAndSetModels = useCallback(async () => {
        setIsModelsLoading(true);
        setModelsLoadingError(null);
        
        const { apiKeysString } = getActiveApiConfig({ ...appSettings, apiKey, useCustomApiConfig });

        const pinnedInternalModels: ModelOption[] = TAB_CYCLE_MODELS.map(id => {
            const name = id.includes('/') 
                ? `Gemini ${id.split('/')[1]}`.replace('gemini-','').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : `Gemini ${id.replace('gemini-','').replace(/-/g, ' ')}`.replace(/\b\w/g, l => l.toUpperCase());
            return { id, name, isPinned: true };
        });
         const ttsModels: ModelOption[] = [
            { id: 'models/gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro (TTS)', isPinned: true },
            { id: 'models/gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash (TTS)', isPinned: true },
        ];
        const imagenModels: ModelOption[] = [
            { id: 'gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash Image', isPinned: true },
            { id: 'models/imagen-4.0-fast-generate-001', name: 'Imagen 4.0 Fast (Image Generation)', isPinned: true },
            { id: 'models/imagen-4.0-generate-001', name: 'Imagen 4.0 (Image Generation)', isPinned: true },
            { id: 'models/imagen-4.0-ultra-generate-001', name: 'Imagen 4.0 Ultra (Image Generation)', isPinned: true },
        ];
        
        let modelsFromApi: ModelOption[] = [];
        try {
            modelsFromApi = await geminiServiceInstance.getAvailableModels(apiKeysString);
        } catch (error) {
            setModelsLoadingError(`API model fetch failed: ${error instanceof Error ? error.message : String(error)}. Using fallbacks.`);
        }

        const modelMap = new Map<string, ModelOption>();
        
        // Add API models first
        modelsFromApi.forEach(model => {
            if (!modelMap.has(model.id)) {
                modelMap.set(model.id, { ...model, isPinned: false });
            }
        });

        // Add pinned models, overwriting if they exist to ensure they are pinned
        [...pinnedInternalModels, ...ttsModels, ...imagenModels].forEach(pinnedModel => {
            modelMap.set(pinnedModel.id, pinnedModel);
        });

        let finalModels = Array.from(modelMap.values());
        finalModels.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return a.name.localeCompare(b.name);
        });
        
        setApiModels(finalModels);

        if (finalModels.length === 0 && !modelsLoadingError) {
            setModelsLoadingError('No models available to select.');
        }
        setIsModelsLoading(false);
    }, [useCustomApiConfig, apiKey]);

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
