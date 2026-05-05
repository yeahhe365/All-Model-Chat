import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../contexts/I18nContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { PwaUpdateBanner } from './PwaUpdateBanner';

describe('PwaUpdateBanner', () => {
  const renderer = setupTestRenderer();
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    useSettingsStore.setState((state) => ({ ...state, language: 'zh' }));
  });

  afterEach(() => {
    useSettingsStore.setState(initialState);
  });

  it('renders refresh and dismiss actions for a waiting update', async () => {
    const onRefresh = vi.fn();
    const onDismiss = vi.fn();

    await act(async () => {
      renderer.root.render(
        <I18nProvider>
          <PwaUpdateBanner onRefresh={onRefresh} onDismiss={onDismiss} />
        </I18nProvider>,
      );
    });

    const buttons = Array.from(renderer.container.querySelectorAll('button'));
    const refreshButton = buttons.find((button) => button.textContent?.includes('刷新'));
    const dismissButton = buttons.find((button) => button.textContent?.includes('稍后'));

    expect(renderer.container.textContent).toContain('发现可用更新');
    expect(renderer.container.textContent).toContain('刷新以更新已安装的应用外壳和最新资源。');
    expect(refreshButton).toBeDefined();
    expect(dismissButton).toBeDefined();

    await act(async () => {
      refreshButton?.click();
      dismissButton?.click();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
