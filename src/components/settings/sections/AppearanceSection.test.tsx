import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import type { AppSettings } from '../../../types';
import { AppearanceSection } from './AppearanceSection';

const settingsFixture: AppSettings = {
  ...useSettingsStore.getState().appSettings,
  themeId: 'system',
  language: 'en',
};

describe('AppearanceSection', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    useSettingsStore.setState(initialState);
  });

  it('updates translated control labels from the global i18n context', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <AppearanceSection settings={settingsFixture} onUpdate={vi.fn()} />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Theme');
    expect(container.textContent).toContain('Base Font Size');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(container.textContent).toContain('主题');
    expect(container.textContent).toContain('基础字号');
  });
});
