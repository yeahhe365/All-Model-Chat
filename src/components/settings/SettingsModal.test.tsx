import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { I18nProvider } from '../../contexts/I18nContext';
import { WindowProvider } from '../../contexts/WindowContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { SettingsModal } from './SettingsModal';

describe('SettingsModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();
  const t = (key: string) => {
    if (key === 'settingsTabAccount') {
      return 'API';
    }
    return key;
  };

  beforeEach(() => {
    localStorage.setItem('chatSettingsLastTab', 'account');
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
    localStorage.clear();
    useSettingsStore.setState(initialState);
  });

  it('renders the active desktop section title inside the scrollable content area', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <WindowProvider>
          <I18nProvider>
            <SettingsModal
              isOpen
              onClose={vi.fn()}
              currentSettings={DEFAULT_APP_SETTINGS}
              availableModels={[]}
              onSave={vi.fn()}
              onClearAllHistory={vi.fn()}
              onClearCache={vi.fn()}
              onOpenLogViewer={vi.fn()}
              setAvailableModels={vi.fn()}
              onInstallPwa={vi.fn()}
              installState="installed"
              onImportSettings={vi.fn()}
              onExportSettings={vi.fn()}
              onImportHistory={vi.fn()}
              onExportHistory={vi.fn()}
              onImportScenarios={vi.fn()}
              onExportScenarios={vi.fn()}
              t={t}
            />
          </I18nProvider>
        </WindowProvider>,
      );
    });

    const fixedDesktopTitle = document.querySelector('main > header h2');
    const scrollingDesktopTitle = document.querySelector('main > div h2');

    expect(fixedDesktopTitle).toBeNull();
    expect(scrollingDesktopTitle?.textContent).toBe('API');
    expect(document.body.textContent).toContain('API & Connection');
  });
});
