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
            availableModels={[
              { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true },
              { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
            ]}
            onUpdateSettings={vi.fn()}
            t={(key) =>
              useSettingsStore.getState().language === 'zh'
                ? String(key)
                : ({
                    shortcuts_prev_file: 'Previous File',
                    shortcuts_next_file: 'Next File',
                  }[String(key)] ?? String(key))
            }
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Previous File');
    expect(container.textContent).toContain('Next File');
  });

  it('renders tab cycle model settings under the cycle models shortcut and updates the selected model list', async () => {
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
            t={(key) =>
              ({
                shortcuts_cycle_models: 'Cycle Models',
                shortcuts_cycle_models_scope_title: 'Models Included In Tab Cycle',
                shortcuts_cycle_models_scope_hint: 'Tab cycles through the checked models in the current picker order.',
                shortcuts_cycle_models_scope_summary: '{count} models selected',
                shortcuts_cycle_models_scope_toggle_aria: 'Toggle Tab cycle model panel',
                shortcuts_cycle_models_scope_model_aria: 'Toggle Tab cycle model',
              })[String(key)] ?? String(key)
            }
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
