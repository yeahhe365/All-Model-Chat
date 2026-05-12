import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { setupStoreStateReset } from '@/test/storeTestUtils';
import { ShortcutsSection } from './ShortcutsSection';

describe('ShortcutsSection', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  it('renders distinct previous and next file labels', async () => {
    await act(async () => {
      renderer.root.render(
        <ShortcutsSection currentSettings={useSettingsStore.getState().appSettings} onUpdateSettings={vi.fn()} />,
      );
    });

    expect(renderer.container.textContent).toContain('Previous File');
    expect(renderer.container.textContent).toContain('Next File');
  });

  it('renders tab cycle model settings in the shortcuts screen and updates the selected model list', async () => {
    const onUpdateSettings = vi.fn();

    await act(async () => {
      renderer.root.render(
        <ShortcutsSection
          currentSettings={{
            ...useSettingsStore.getState().appSettings,
            tabModelCycleIds: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview'],
          }}
          availableModels={[
            { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true },
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
            { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview', isPinned: true },
          ]}
          onUpdateSettings={onUpdateSettings}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('Models Included In Tab Cycle');
    expect(renderer.container.textContent).toContain('2 models selected');
    expect(renderer.container.textContent).not.toContain('Gemini 3.1 Flash Lite Preview');

    const shortcutText = renderer.container.textContent ?? '';
    expect(shortcutText.indexOf('Cycle Models')).toBeLessThan(shortcutText.indexOf('Models Included In Tab Cycle'));
    expect(shortcutText.indexOf('Models Included In Tab Cycle')).toBeLessThan(shortcutText.indexOf('Clear Draft'));

    const toggleButton = renderer.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle Tab cycle model panel"]',
    );
    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');

    const tabCycleCard = toggleButton?.closest('div');
    const tabCycleTitle = Array.from(toggleButton?.querySelectorAll('span') ?? []).find(
      (element) => element.textContent === 'Models Included In Tab Cycle',
    );
    expect(tabCycleCard?.className).toContain('rounded-lg');
    expect(tabCycleCard?.className).not.toContain('rounded-xl');
    expect(tabCycleTitle?.className).toContain('text-sm');
    expect(tabCycleTitle?.className).toContain('text-[var(--theme-text-primary)]');
    expect(tabCycleTitle?.className).not.toContain('uppercase');
    expect(toggleButton?.querySelector('svg')).not.toBeNull();

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');
    expect(renderer.container.textContent).toContain('Gemini 3.1 Pro Preview');
    expect(renderer.container.textContent).toContain('Gemini 3 Flash Preview');
    expect(renderer.container.textContent).toContain('Gemini 3.1 Flash Lite Preview');

    const flashCheckbox = renderer.container.querySelector<HTMLInputElement>(
      'input[aria-label="Toggle Tab cycle model: Gemini 3 Flash Preview"]',
    );
    expect(flashCheckbox).not.toBeNull();

    await act(async () => {
      flashCheckbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({
      tabModelCycleIds: ['gemini-3.1-pro-preview'],
    });
  });
});
