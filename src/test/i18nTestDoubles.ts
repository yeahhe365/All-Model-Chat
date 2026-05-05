import { getTranslator } from '../utils/translations';

type Language = 'en' | 'zh';
type Translator = ReturnType<typeof getTranslator>;

interface I18nMockOptions {
  language?: Language;
  t?: Translator;
}

export const createKeyTranslator =
  (): Translator =>
  (key, fallback) =>
    fallback ?? key;

export const createI18nMock = (options: I18nMockOptions = {}) => {
  const language = options.language ?? 'en';
  const t = options.t ?? createKeyTranslator();

  return {
    useI18n: () => ({
      language,
      t,
    }),
  };
};

export const createRealI18nMock = (language: Language = 'en') =>
  createI18nMock({
    language,
    t: getTranslator(language),
  });
