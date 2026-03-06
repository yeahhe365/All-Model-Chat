import React, { createContext, useContext, useMemo } from 'react';
import { getTranslator, translations } from '../utils/translations';

type Translator = (key: keyof typeof translations, fallback?: string) => string;

interface TranslationContextType {
  t: Translator;
  language: 'en' | 'zh';
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ language: 'en' | 'zh', children: React.ReactNode }> = ({ language, children }) => {
  const t = useMemo(() => getTranslator(language), [language]);

  return (
    <TranslationContext.Provider value={{ t, language }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
