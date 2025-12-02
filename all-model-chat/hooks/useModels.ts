
import { useState } from 'react';
import { ModelOption, AppSettings } from '../types';
import { TAB_CYCLE_MODELS, STATIC_TTS_MODELS, STATIC_IMAGEN_MODELS } from '../constants/appConstants';
import { sortModels } from '../utils/appUtils';

const getPinnedModels = (): ModelOption[] => {
    const pinnedInternalModels: ModelOption[] = TAB_CYCLE_MODELS.map(id => {
        let name;
        if (id.toLowerCase().includes('gemma')) {
             name = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else {
             name = id.includes('/') 
                ? `Gemini ${id.split('/')[1]}`.replace('gemini-','').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : `Gemini ${id.replace('gemini-','').replace(/-/g, ' ')}`.replace(/\b\w/g, l => l.toUpperCase());
        }
        return { id, name, isPinned: true };
    });
    return [...pinnedInternalModels, ...STATIC_TTS_MODELS, ...STATIC_IMAGEN_MODELS];
};

export const useModels = (appSettings: AppSettings) => {
    // Initialize with static models only, sorted.
    const [apiModels, setApiModels] = useState<ModelOption[]>(sortModels(getPinnedModels()));
    
    // Maintain state interface for compatibility, but defaulting to loaded/no error.
    const [modelsLoadingError] = useState<string | null>(null);
    const [isModelsLoading] = useState<boolean>(false);

    return { apiModels, isModelsLoading, modelsLoadingError, setApiModels };
};