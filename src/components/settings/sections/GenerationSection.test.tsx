import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../../stores/settingsStore';
import { setupStoreStateReset } from '../../../test/storeTestUtils';
import { MediaResolution } from '../../../types/settings';
import { GenerationSection } from './GenerationSection';

vi.mock('../controls/thinking/ThinkingControl', () => ({
  ThinkingControl: () => <div data-testid="thinking-control" />,
}));

vi.mock('../../modals/TextEditorModal', () => ({
  TextEditorModal: () => null,
}));

vi.mock('../../shared/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('GenerationSection', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  const baseSettings = {
    ...useSettingsStore.getState().appSettings,
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows system prompt status and clears the prompt through the current models panel', async () => {
    const onUpdateSetting = vi.fn();

    await act(async () => {
      renderer.root.render(
        <GenerationSection
          modelId="gemini-3-flash-preview"
          currentSettings={{ ...baseSettings, systemInstruction: 'Stay concise.' }}
          onUpdateSetting={onUpdateSetting}
        />,
      );
    });

    const textarea = renderer.container.querySelector<HTMLTextAreaElement>('#system-prompt-input');
    const clearButton = renderer.container.querySelector<HTMLButtonElement>('[aria-label="Clear system prompt"]');
    const expandButton = renderer.container.querySelector<HTMLButtonElement>('[aria-label="Full editor"]');

    expect(renderer.container.textContent).toContain('Enabled');
    expect(textarea?.className).toContain('min-h-[112px]');
    expect(clearButton).not.toBeNull();
    expect(clearButton?.className).toContain('hover:text-[var(--theme-text-danger)]');
    expect(expandButton?.className).toContain('w-8');
    expect(expandButton?.className).toContain('h-8');
    expect(expandButton?.className).toContain('hover:text-[var(--theme-text-link)]');

    await act(async () => {
      clearButton?.click();
    });

    expect(onUpdateSetting).toHaveBeenCalledWith('systemInstruction', '');
    expect(textarea?.value).toBe('');
    expect(renderer.container.textContent).toContain('Not set');
    expect(renderer.container.querySelector<HTMLButtonElement>('[aria-label="Clear system prompt"]')).toBeNull();
  });

  it('keeps ultra-high media resolution available only for supported Gemini models', async () => {
    const ultraHighSettings = {
      ...baseSettings,
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH,
    };

    await act(async () => {
      renderer.root.render(
        <GenerationSection modelId="gemini-2.5-flash" currentSettings={ultraHighSettings} onUpdateSetting={vi.fn()} />,
      );
    });

    expect(renderer.container.textContent).not.toContain('Ultra High');

    await act(async () => {
      renderer.root.render(
        <GenerationSection
          modelId="gemini-3-flash-preview"
          currentSettings={ultraHighSettings}
          onUpdateSetting={vi.fn()}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('Ultra High');

    await act(async () => {
      renderer.root.render(
        <GenerationSection
          modelId="gemini-robotics-er-1.6-preview"
          currentSettings={ultraHighSettings}
          onUpdateSetting={vi.fn()}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('Ultra High');
  });
});
