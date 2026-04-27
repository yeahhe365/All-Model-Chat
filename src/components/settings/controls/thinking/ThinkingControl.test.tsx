import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../contexts/I18nContext';
import { useSettingsStore } from '../../../../stores/settingsStore';
import { ThinkingControl } from './ThinkingControl';

vi.mock('../../../shared/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ThinkingControl image model behavior', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
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
    useSettingsStore.setState(initialState);
  });

  it('limits Gemini 3.1 Flash Image to MINIMAL/HIGH and normalizes unsupported settings', async () => {
    const setThinkingBudget = vi.fn();
    const setThinkingLevel = vi.fn();

    await act(async () => {
      root.render(
        <I18nProvider>
          <ThinkingControl
            modelId="gemini-3.1-flash-image-preview"
            thinkingBudget={0}
            setThinkingBudget={setThinkingBudget}
            thinkingLevel="LOW"
            setThinkingLevel={setThinkingLevel}
            showThoughts
            setShowThoughts={vi.fn()}
            t={(key) => key}
          />
        </I18nProvider>,
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
        <I18nProvider>
          <ThinkingControl
            modelId="gemini-3-pro-image-preview"
            thinkingBudget={-1}
            setThinkingBudget={vi.fn()}
            thinkingLevel="HIGH"
            setThinkingLevel={vi.fn()}
            showThoughts
            setShowThoughts={vi.fn()}
            t={(key) => key}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent?.trim()).toBe('');
  });

  it('hides ThinkingControl for Gemini 3.1 Flash TTS Preview because the model does not support thinking', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <ThinkingControl
            modelId="gemini-3.1-flash-tts-preview"
            thinkingBudget={-1}
            setThinkingBudget={vi.fn()}
            thinkingLevel="HIGH"
            setThinkingLevel={vi.fn()}
            showThoughts={false}
            setShowThoughts={vi.fn()}
            t={(key) => key}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent?.trim()).toBe('');
  });

  it('shows Gemma reasoning as MINIMAL/HIGH level choices', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <ThinkingControl
            modelId="gemma-4-31b-it"
            thinkingBudget={0}
            setThinkingBudget={vi.fn()}
            thinkingLevel="HIGH"
            setThinkingLevel={vi.fn()}
            showThoughts
            setShowThoughts={vi.fn()}
            t={(key) => key}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('settingsGemmaReasoningToggle_label');
    expect(container.textContent).toContain('Minimal');
    expect(container.textContent).toContain('High');
    expect(container.textContent).not.toContain('Low');
    expect(container.textContent).not.toContain('Medium');
    expect(container.textContent).toContain('settingsGemmaReasoningToggle_enabledDesc');
    const toggleButton = container.querySelector('button[aria-pressed]');
    expect(toggleButton).toBeNull();
  });

  it('switches Gemma reasoning to HIGH when the High level is selected', async () => {
    const setShowThoughts = vi.fn();

    await act(async () => {
      root.render(
        <I18nProvider>
          <ThinkingControl
            modelId="gemma-4-31b-it"
            thinkingBudget={0}
            setThinkingBudget={vi.fn()}
            thinkingLevel="HIGH"
            setThinkingLevel={vi.fn()}
            showThoughts={false}
            setShowThoughts={setShowThoughts}
            t={(key) => key}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('settingsGemmaReasoningToggle_disabledDesc');

    const highButton = Array.from(container.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('High'),
    );
    expect(highButton).not.toBeNull();

    await act(async () => {
      highButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setShowThoughts).toHaveBeenCalledWith(true);
  });

  it('shows full thinking level options for Gemini Robotics-ER 1.6 in auto mode', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <ThinkingControl
            modelId="gemini-robotics-er-1.6-preview"
            thinkingBudget={-1}
            setThinkingBudget={vi.fn()}
            thinkingLevel="LOW"
            setThinkingLevel={vi.fn()}
            showThoughts
            setShowThoughts={vi.fn()}
            t={(key) => key}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Minimal');
    expect(container.textContent).toContain('Low');
    expect(container.textContent).toContain('Medium');
    expect(container.textContent).toContain('High');
  });

  it('does not show the reasoning badge in the standard thinking header', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <ThinkingControl
            modelId="gemini-robotics-er-1.6-preview"
            thinkingBudget={-1}
            setThinkingBudget={vi.fn()}
            thinkingLevel="HIGH"
            setThinkingLevel={vi.fn()}
            showThoughts
            setShowThoughts={vi.fn()}
            t={(key) => key}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).not.toContain('settingsReasoningBadgeGemini3');
    expect(container.textContent).not.toContain('settingsReasoningBadgeEnabled');
  });

  it('hides the off mode for Gemini Robotics-ER 1.6 and normalizes legacy off state to minimal', async () => {
    const setThinkingBudget = vi.fn();
    const setThinkingLevel = vi.fn();

    await act(async () => {
      root.render(
        <I18nProvider>
          <ThinkingControl
            modelId="gemini-robotics-er-1.6-preview"
            thinkingBudget={0}
            setThinkingBudget={setThinkingBudget}
            thinkingLevel="HIGH"
            setThinkingLevel={setThinkingLevel}
            showThoughts
            setShowThoughts={vi.fn()}
            t={(key) => key}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('settingsThinkingMode_auto');
    expect(container.textContent).toContain('settingsThinkingMode_custom');
    expect(container.textContent).not.toContain('settingsThinkingMode_off');
    expect(setThinkingBudget).toHaveBeenCalledWith(-1);
    expect(setThinkingLevel).toHaveBeenCalledWith('MINIMAL');
  });
});
