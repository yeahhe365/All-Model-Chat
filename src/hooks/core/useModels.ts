import { useState, useCallback, useEffect } from 'react';
import { ModelOption } from '../../types';
import { sanitizeModelOptions } from '../../utils/modelHelpers';

const CUSTOM_MODELS_KEY = 'custom_model_list_v1';

const parseStoredModels = (storedValue: string | null): ModelOption[] | null => {
  if (storedValue === null) {
    return null;
  }

  return sanitizeModelOptions(JSON.parse(storedValue));
};

export const useModels = () => {
  // Initialize with persisted models or defaults
  const [apiModels, setApiModelsState] = useState<ModelOption[]>(() => {
    try {
      const storedModels = parseStoredModels(localStorage.getItem(CUSTOM_MODELS_KEY));
      if (storedModels) {
        return storedModels;
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

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CUSTOM_MODELS_KEY) {
        return;
      }

      try {
        const storedModels = parseStoredModels(event.newValue);
        if (storedModels) {
          setApiModelsState(storedModels);
          setIsModelsLoading(false);
          setModelsLoadingError(null);
          return;
        }

        setApiModelsState([]);
        setIsModelsLoading(true);
        setModelsLoadingError(null);
      } catch (error) {
        console.error('Failed to sync custom models from storage', error);
        setModelsLoadingError('Failed to load default models');
        setIsModelsLoading(false);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setApiModels = useCallback((models: ModelOption[]) => {
    const sanitizedModels = sanitizeModelOptions(models);
    setApiModelsState(sanitizedModels);
    setIsModelsLoading(false);
    setModelsLoadingError(null);
    localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(sanitizedModels));
  }, []);

  return { apiModels, setApiModels, isModelsLoading, modelsLoadingError };
};
