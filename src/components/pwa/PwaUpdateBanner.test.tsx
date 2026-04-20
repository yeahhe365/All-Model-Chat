import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../contexts/I18nContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { PwaUpdateBanner } from './PwaUpdateBanner';

describe('PwaUpdateBanner', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useSettingsStore.setState((state) => ({ ...state, language: 'zh' }));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    useSettingsStore.setState(initialState);
  });

  it('renders refresh and dismiss actions for a waiting update', async () => {
    const onRefresh = vi.fn();
    const onDismiss = vi.fn();

    await act(async () => {
      root.render(
        <I18nProvider>
          <PwaUpdateBanner onRefresh={onRefresh} onDismiss={onDismiss} />
        </I18nProvider>,
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const refreshButton = buttons.find((button) => button.textContent?.includes('刷新'));
    const dismissButton = buttons.find((button) => button.textContent?.includes('稍后'));

    expect(container.textContent).toContain('发现可用更新');
    expect(container.textContent).toContain('刷新以更新已安装的应用外壳和最新资源。');
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
