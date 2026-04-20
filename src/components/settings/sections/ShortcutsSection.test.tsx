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
            t={(key) => useSettingsStore.getState().language === 'zh' ? String(key) : ({
              shortcuts_prev_file: 'Previous File',
              shortcuts_next_file: 'Next File',
            }[String(key)] ?? String(key))}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Previous File');
    expect(container.textContent).toContain('Next File');
  });
});
