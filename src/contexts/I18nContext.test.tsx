import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '../stores/settingsStore';
import { I18nProvider, useI18n } from './I18nContext';

const TranslationProbe = () => {
  const { t } = useI18n();
  return <div data-testid="translation-probe">{t('newChat')}</div>;
};

describe('I18nContext', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useSettingsStore.setState(initialState);
  });

  it('updates translated text when the language in the settings store changes', () => {
    act(() => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <TranslationProbe />
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('New Chat');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('新聊天');
  });
});
