import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it } from 'vitest';
import { setupStoreStateReset } from '@/test/storeTestUtils';
import { useSettingsStore } from '@/stores/settingsStore';
import { I18nProvider, useI18n } from './I18nContext';

const TranslationProbe = () => {
  const { t } = useI18n();
  return <div data-testid="translation-probe">{t('newChat')}</div>;
};

describe('I18nContext', () => {
  const renderer = setupTestRenderer();
  setupStoreStateReset();

  it('updates translated text when the language in the settings store changes', () => {
    act(() => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
        <I18nProvider>
          <TranslationProbe />
        </I18nProvider>,
      );
    });

    expect(renderer.container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('New Chat');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(renderer.container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('新聊天');
  });
});
