import { useState, useCallback, useEffect, useMemo } from 'react';
import { ModelOption } from '../../types';
import { sanitizeModelOptions } from '../../utils/modelHelpers';
import { useModelPreferencesStore } from '../../stores/modelPreferencesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTranslator } from '../../i18n/translations';

export const useModels = () => {
  useModelPreferencesStore.getState().hydrateLegacyModelPreferences();

  const language = useSettingsStore((state) => state.language);
  const t = useMemo(() => getTranslator(language), [language]);
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
        console.error('Default model import failed', error);
        if (!isActive) return;
        setModelsLoadingError(t('appDefaultModelsLoadError'));
        setIsDefaultModelsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [hasCustomModels, t]);

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
