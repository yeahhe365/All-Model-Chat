import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { setupStoreStateReset } from '../../test/storeTestUtils';
import { PwaUpdateBanner } from './PwaUpdateBanner';

describe('PwaUpdateBanner', () => {
  const renderer = setupTestRenderer({ providers: { language: 'zh' } });
  setupStoreStateReset();

  it('renders refresh and dismiss actions for a waiting update', async () => {
    const onRefresh = vi.fn();
    const onDismiss = vi.fn();

    await act(async () => {
      renderer.root.render(<PwaUpdateBanner onRefresh={onRefresh} onDismiss={onDismiss} />);
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
