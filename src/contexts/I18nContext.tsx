/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { getTranslator } from '../utils/translations';

type Translator = ReturnType<typeof getTranslator>;

interface I18nContextValue {
  language: 'en' | 'zh';
  t: Translator;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language = useSettingsStore((state) => state.language);
  const t = useMemo(() => getTranslator(language), [language]);
  const value = useMemo(() => ({ language, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return value;
};
