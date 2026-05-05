import { describe, expect, it, vi } from 'vitest';
import { createI18nMock, createKeyTranslator, createRealI18nMock } from './i18nTestDoubles';

describe('i18nTestDoubles', () => {
  it('creates an I18nContext mock that returns keys by default', () => {
    const { useI18n } = createI18nMock();

    expect(useI18n().language).toBe('en');
    expect(useI18n().t('missing_key')).toBe('missing_key');
    expect(useI18n().t('missing_key', 'Fallback')).toBe('Fallback');
  });

  it('accepts a custom translator spy', () => {
    const t = vi.fn((key: string) => `translated:${key}`);
    const { useI18n } = createI18nMock({ t });

    expect(useI18n().t('hello')).toBe('translated:hello');
    expect(t).toHaveBeenCalledWith('hello');
  });

  it('can use the real translation table when a test asserts visible English copy', () => {
    const { useI18n } = createRealI18nMock('en');

    expect(useI18n().t('liveStatus_end_call')).toBe('End Call');
  });

  it('exposes the key translator for direct overrides', () => {
    const t = createKeyTranslator();

    expect(t('label')).toBe('label');
    expect(t('label', 'Fallback Label')).toBe('Fallback Label');
  });
});
