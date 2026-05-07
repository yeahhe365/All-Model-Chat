import { useState, useCallback, useEffect } from 'react';
import { ModelOption } from '../../types';
import { sanitizeModelOptions } from '../../utils/modelHelpers';
import { useModelPreferencesStore } from '../../stores/modelPreferencesStore';

export const useModels = () => {
  useModelPreferencesStore.getState().hydrateLegacyModelPreferences();

  const customModels = useModelPreferencesStore((state) => state.customModels);
  const setCustomModels = useModelPreferencesStore((state) => state.setCustomModels);
  const [defaultModels, setDefaultModels] = useState<ModelOption[]>([]);
  const [isDefaultModelsLoading, setIsDefaultModelsLoading] = useState(() => !customModels?.length);
  const [modelsLoadingError, setModelsLoadingError] = useState<string | null>(null);
  const hasCustomModels = !!customModels?.length;

  useEffect(() => {
    if (hasCustomModels) {
      setIsDefaultModelsLoading(false);
      return;
    }

    let isActive = true;
    setIsDefaultModelsLoading(true);

    void import('../../utils/defaultModelOptions')
      .then(({ getDefaultModelOptions }) => {
        if (!isActive) return;
        setDefaultModels(getDefaultModelOptions());
        setIsDefaultModelsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load default models', error);
        if (!isActive) return;
        setModelsLoadingError('Failed to load default models');
        setIsDefaultModelsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [hasCustomModels]);

  const setApiModels = useCallback(
    (models: ModelOption[]) => {
      const sanitizedModels = sanitizeModelOptions(models);
      setModelsLoadingError(null);
      setCustomModels(sanitizedModels);
    },
    [setCustomModels],
  );

  return {
    apiModels: hasCustomModels ? customModels : defaultModels,
    setApiModels,
    isModelsLoading: hasCustomModels ? false : isDefaultModelsLoading,
    modelsLoadingError,
  };
};
