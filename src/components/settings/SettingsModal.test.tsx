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

  it('does not render the obsolete desktop section title above the active settings page', async () => {
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
              t={(key) => String(key)}
            />
          </I18nProvider>
        </WindowProvider>,
      );
    });

    expect(document.querySelector('main > header h2')).toBeNull();
    expect(document.body.textContent).toContain('API & Connection');
  });
});
