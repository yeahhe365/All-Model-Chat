import { registerTranslations, type TranslationMap } from './coreTranslations';

export type TranslationFeature = 'settings' | 'logViewer' | 'scenarios';

const loadedFeatures = new Set<TranslationFeature>();
const loadingFeatures = new Map<TranslationFeature, Promise<void>>();

const loadSettingsTranslations = async (): Promise<TranslationMap> => {
  const [general, appearance, api, model, data, safety, shortcuts, about] = await Promise.all([
    import('./translations/settings/general'),
    import('./translations/settings/appearance'),
    import('./translations/settings/api'),
    import('./translations/settings/model'),
    import('./translations/settings/data'),
    import('./translations/settings/safety'),
    import('./translations/settings/shortcuts'),
    import('./translations/settings/about'),
  ]);

  return {
    ...general.generalSettings,
    ...appearance.appearanceSettings,
    ...api.apiSettings,
    ...model.modelSettings,
    ...data.dataSettings,
    ...safety.safetySettings,
    ...shortcuts.shortcutsSettings,
    ...about.aboutSettings,
  };
};

const loadFeatureTranslations = async (feature: TranslationFeature): Promise<TranslationMap> => {
  switch (feature) {
    case 'settings':
      return loadSettingsTranslations();
    case 'logViewer': {
      const module = await import('./translations/logViewer');
      return module.logViewerTranslations;
    }
    case 'scenarios': {
      const module = await import('./translations/scenarios');
      return module.scenariosTranslations;
    }
  }
};

export const ensureFeatureTranslations = (feature: TranslationFeature) => {
  if (loadedFeatures.has(feature)) {
    return Promise.resolve();
  }

  const existingLoad = loadingFeatures.get(feature);
  if (existingLoad) {
    return existingLoad;
  }

  const load = loadFeatureTranslations(feature)
    .then((translationMap) => {
      registerTranslations(translationMap);
      loadedFeatures.add(feature);
    })
    .finally(() => {
      loadingFeatures.delete(feature);
    });

  loadingFeatures.set(feature, load);
  return load;
};

export const ensureAllFeatureTranslations = () =>
  Promise.all([
    ensureFeatureTranslations('settings'),
    ensureFeatureTranslations('logViewer'),
    ensureFeatureTranslations('scenarios'),
  ]).then(() => undefined);
