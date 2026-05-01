import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { ShortcutsSection } from './ShortcutsSection';

describe('ShortcutsSection', () => {
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

  it('renders distinct previous and next file labels', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ShortcutsSection
            currentSettings={useSettingsStore.getState().appSettings}
            onUpdateSettings={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Previous File');
    expect(container.textContent).toContain('Next File');
  });

  it('renders tab cycle model settings in the shortcuts screen and updates the selected model list', async () => {
    const onUpdateSettings = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
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
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Models Included In Tab Cycle');
    expect(container.textContent).toContain('2 models selected');
    expect(container.textContent).not.toContain('Gemini 3.1 Flash Lite Preview');

    const toggleButton = container.querySelector<HTMLButtonElement>(
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
    expect(container.textContent).toContain('Gemini 3.1 Pro Preview');
    expect(container.textContent).toContain('Gemini 3 Flash Preview');
    expect(container.textContent).toContain('Gemini 3.1 Flash Lite Preview');

    const flashCheckbox = container.querySelector<HTMLInputElement>(
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
