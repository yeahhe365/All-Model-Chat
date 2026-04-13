import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThinkingControl } from './ThinkingControl';

vi.mock('../../../shared/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ThinkingControl image model behavior', () => {
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
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('limits Gemini 3.1 Flash Image to MINIMAL/HIGH and normalizes unsupported settings', async () => {
    const setThinkingBudget = vi.fn();
    const setThinkingLevel = vi.fn();

    await act(async () => {
      root.render(
        <ThinkingControl
          modelId="gemini-3.1-flash-image-preview"
          thinkingBudget={0}
          setThinkingBudget={setThinkingBudget}
          thinkingLevel="LOW"
          setThinkingLevel={setThinkingLevel}
          showThoughts
          setShowThoughts={vi.fn()}
          t={(key) => key}
        />,
      );
    });

    expect(container.textContent).toContain('Minimal');
    expect(container.textContent).toContain('High');
    expect(container.textContent).not.toContain('Low');
    expect(container.textContent).not.toContain('Medium');
    expect(container.textContent).not.toContain('settingsThinkingMode_custom');
    expect(container.textContent).not.toContain('settingsThinkingMode_off');
    expect(setThinkingBudget).toHaveBeenCalledWith(-1);
    expect(setThinkingLevel).toHaveBeenCalledWith('MINIMAL');
  });

  it('hides ThinkingControl for Gemini 3 Pro Image because the request config does not use it', async () => {
    await act(async () => {
      root.render(
        <ThinkingControl
          modelId="gemini-3-pro-image-preview"
          thinkingBudget={-1}
          setThinkingBudget={vi.fn()}
          thinkingLevel="HIGH"
          setThinkingLevel={vi.fn()}
          showThoughts
          setShowThoughts={vi.fn()}
          t={(key) => key}
        />,
      );
    });

    expect(container.textContent?.trim()).toBe('');
  });
});
