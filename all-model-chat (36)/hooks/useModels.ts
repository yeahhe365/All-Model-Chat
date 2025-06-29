import { useState, useEffect } from 'react';
import { ModelOption } from '../types';
import { geminiServiceInstance } from '../services/geminiService';
import { TAB_CYCLE_MODELS, CACHED_MODELS_KEY } from '../constants/appConstants';

export const useModels = (appSettings: { apiKey: string | null, apiUrl: string | null, useCustomApiConfig: boolean }) => {
    const [apiModels, setApiModels] = useState<ModelOption[]>([]);
    const [modelsLoadingError, setModelsLoadingError] = useState<string | null>(null);
    const [isModelsLoading, setIsModelsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchAndSetModels = async () => {
            setIsModelsLoading(true);
            setModelsLoadingError(null);

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
                { id: 'imagen-3.0-generate-002', name: 'Imagen 3 (Image Generation)', isPinned: true },
                { id: 'imagen-4.0-generate-preview-06-06', name: 'Imagen 4 Preview (Image Generation)', isPinned: true },
                { id: 'imagen-4.0-ultra-generate-preview-06-06', name: 'Imagen 4 Ultra (Image Generation)', isPinned: true },
            ];
            const veoModels: ModelOption[] = [
                { id: 'veo-2.0-generate-001', name: 'Veo 2 (Video Generation)', isPinned: true },
            ];
            
            let allAvailableModels: ModelOption[] = [];

            try {
                // This is the online path
                const modelsFromApi = await geminiServiceInstance.getAvailableModels();
                
                const modelMap = new Map<string, ModelOption>();
                modelsFromApi.forEach(model => modelMap.set(model.id, { ...model, isPinned: false }));
                [...pinnedInternalModels, ...ttsModels, ...imagenModels, ...veoModels].forEach(pinnedModel => modelMap.set(pinnedModel.id, pinnedModel));
                
                allAvailableModels = Array.from(modelMap.values());
                localStorage.setItem(CACHED_MODELS_KEY, JSON.stringify(allAvailableModels));

            } catch (error) {
                // This is the offline/error path
                console.warn(`API model fetch failed: ${error instanceof Error ? error.message : String(error)}. Trying cache or fallbacks.`);
                try {
                    const cached = localStorage.getItem(CACHED_MODELS_KEY);
                    if (cached) {
                        allAvailableModels = JSON.parse(cached);
                    } else {
                        // No cache available, show error and use only pinned models as fallback
                        setModelsLoadingError(`Could not fetch models and no cache is available. Using pinned models as fallback.`);
                        allAvailableModels = [...pinnedInternalModels, ...ttsModels, ...imagenModels, ...veoModels];
                    }
                } catch (cacheError) {
                    console.error("Failed to parse cached models:", cacheError);
                    setModelsLoadingError("Failed to fetch models and cache is corrupted. Using pinned models as fallback.");
                    allAvailableModels = [...pinnedInternalModels, ...ttsModels, ...imagenModels, ...veoModels];
                }
            }
            
            allAvailableModels.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return a.name.localeCompare(b.name);
            });
            
            setApiModels(allAvailableModels);

            if (allAvailableModels.length === 0 && !modelsLoadingError) {
                setModelsLoadingError('No models available to select.');
            }
            setIsModelsLoading(false);
        };

        fetchAndSetModels();
    }, [appSettings.apiKey, appSettings.apiUrl, appSettings.useCustomApiConfig]);

    return { apiModels, isModelsLoading, modelsLoadingError, setApiModels };
};