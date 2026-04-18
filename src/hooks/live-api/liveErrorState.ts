import type { translations } from '../../utils/translations';

export type LiveTranslationValues = Record<string, string | number>;

export type LiveErrorState =
  | {
      kind: 'translation';
      key: keyof typeof translations | string;
      values?: LiveTranslationValues;
      fallback?: string;
    }
  | {
      kind: 'raw';
      message: string;
    };

export const resolveLiveErrorText = (
  errorState: LiveErrorState | null,
  t: (key: keyof typeof translations | string, fallback?: string) => string,
): string | null => {
  if (!errorState) {
    return null;
  }

  if (errorState.kind === 'raw') {
    return errorState.message;
  }

  const template = t(errorState.key, errorState.fallback);
  if (!errorState.values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (placeholder, key) => {
    const value = errorState.values?.[key];
    return value === undefined ? placeholder : String(value);
  });
};
