import { useState, useEffect } from 'react';
import { ModelOption } from '../types';
import { geminiServiceInstance } from '../services/geminiService';
import { TAB_CYCLE_MODELS } from '../constants/appConstants';

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
            
            const modelMap = new Map<string, ModelOption>();
            
            // Add pinned models first to establish them.
            [...pinnedInternalModels, ...ttsModels, ...imagenModels, ...veoModels].forEach(pinnedModel => {
                modelMap.set(pinnedModel.id, pinnedModel);
            });

            try {
                // geminiServiceInstance.getAvailableModels() will return fallbacks on error.
                const modelsFromApi = await geminiServiceInstance.getAvailableModels();
                
                // Add models from API, but don't overwrite pinned ones to preserve their pinned status.
                modelsFromApi.forEach(model => {
                    if (!modelMap.has(model.id)) {
                        modelMap.set(model.id, { ...model, isPinned: false });
                    }
                });
            } catch (error) {
                // This catch is for unexpected errors from the service, though it's designed to not throw.
                setModelsLoadingError(`API model fetch failed: ${error instanceof Error ? error.message : String(error)}. Using fallbacks.`);
            }

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
        };

        fetchAndSetModels();
    }, [appSettings.apiKey, appSettings.apiUrl, appSettings.useCustomApiConfig]);

    return { apiModels, isModelsLoading, modelsLoadingError, setApiModels };
};