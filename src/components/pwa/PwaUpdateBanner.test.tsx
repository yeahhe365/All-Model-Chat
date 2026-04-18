import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaUpdateBanner } from './PwaUpdateBanner';

describe('PwaUpdateBanner', () => {
  let container: HTMLDivElement;
  let root: Root;

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
  });

  it('renders refresh and dismiss actions for a waiting update', async () => {
    const onRefresh = vi.fn();
    const onDismiss = vi.fn();

    await act(async () => {
      root.render(<PwaUpdateBanner onRefresh={onRefresh} onDismiss={onDismiss} />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const refreshButton = buttons.find((button) => button.textContent?.includes('Refresh'));
    const dismissButton = buttons.find((button) => button.textContent?.includes('Later'));

    expect(container.textContent).toContain('A newer version of the app is ready.');
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
