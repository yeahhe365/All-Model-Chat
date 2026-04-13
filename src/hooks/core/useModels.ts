
import { useState, useCallback, useEffect } from 'react';
import { ModelOption } from '../../types';
import { sanitizeModelOptions } from '../../utils/modelHelpers';

const CUSTOM_MODELS_KEY = 'custom_model_list_v1';

export const useModels = () => {
    // Initialize with persisted models or defaults
    const [apiModels, setApiModelsState] = useState<ModelOption[]>(() => {
        try {
            const stored = localStorage.getItem(CUSTOM_MODELS_KEY);
            if (stored) {
                return sanitizeModelOptions(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load custom models', e);
        }
        return [];
    });
    const [isModelsLoading, setIsModelsLoading] = useState(() => apiModels.length === 0);
    const [modelsLoadingError, setModelsLoadingError] = useState<string | null>(null);

    useEffect(() => {
        if (apiModels.length > 0) {
            setIsModelsLoading(false);
            return;
        }

        let isActive = true;

        void import('../../utils/defaultModelOptions')
            .then(({ getDefaultModelOptions }) => {
                if (!isActive) return;
                setApiModelsState(getDefaultModelOptions());
                setIsModelsLoading(false);
            })
            .catch((error) => {
                console.error('Failed to load default models', error);
                if (!isActive) return;
                setModelsLoadingError('Failed to load default models');
                setIsModelsLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [apiModels.length]);
    
    const setApiModels = useCallback((models: ModelOption[]) => {
        const sanitizedModels = sanitizeModelOptions(models);
        setApiModelsState(sanitizedModels);
        setIsModelsLoading(false);
        setModelsLoadingError(null);
        localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(sanitizedModels));
    }, []);

    return { apiModels, setApiModels, isModelsLoading, modelsLoadingError };
};
