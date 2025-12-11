
import { useState, useCallback } from 'react';
import { ModelOption } from '../types';
import { sortModels, getDefaultModelOptions } from '../utils/appUtils';

const CUSTOM_MODELS_KEY = 'custom_model_list_v1';

export const useModels = () => {
    // Initialize with persisted models or defaults
    const [apiModels, setApiModelsState] = useState<ModelOption[]>(() => {
        try {
            const stored = localStorage.getItem(CUSTOM_MODELS_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load custom models', e);
        }
        return getDefaultModelOptions();
    });
    
    const setApiModels = useCallback((models: ModelOption[]) => {
        setApiModelsState(models);
        localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(models));
    }, []);

    // Currently loading is instantaneous for local storage, but structure prepared for API fetch
    const isModelsLoading = false;
    const modelsLoadingError = null;

    return { apiModels, setApiModels, isModelsLoading, modelsLoadingError };
};
