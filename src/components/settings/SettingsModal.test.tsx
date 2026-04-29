import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { I18nProvider } from '../../contexts/I18nContext';
import { WindowProvider } from '../../contexts/WindowContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { translations } from '../../utils/translations';
import { SettingsModal } from './SettingsModal';

describe('SettingsModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();
  const t = (key: string) => {
    if (key === 'settingsTabApi') {
      return 'API';
    }
    return key;
  };
  const translateEn = (key: string) => {
    const entry = translations[key as keyof typeof translations];
    return typeof entry === 'object' && entry && 'en' in entry ? entry.en : key;
  };

  beforeEach(() => {
    localStorage.setItem('chatSettingsLastTab', 'api');
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

  it('opens the settings surface without any enter animation class', async () => {
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

    const settingsSurface = document.querySelector('[role="dialog"] > div');

    expect(settingsSurface).not.toBeNull();
    expect(settingsSurface?.className).not.toContain('modal-enter-animation');
    expect(settingsSurface?.className).not.toContain('settings-surface-enter-animation');
  });

  it('shows the granular settings navigation for each settings section', async () => {
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
              t={translateEn}
            />
          </I18nProvider>
        </WindowProvider>,
      );
    });

    const tabLabels = Array.from(document.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent?.trim());

    expect(tabLabels).toEqual([
      'Models',
      'API',
      'Interface & Interaction',
      'Data & App',
      'Shortcuts',
      'About',
    ]);
    expect(document.body.textContent).not.toContain('Chat');
  });

  it('renders shortcuts in its own sidebar group', async () => {
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
              t={translateEn}
            />
          </I18nProvider>
        </WindowProvider>,
      );
    });

    const groups = Array.from(document.querySelectorAll('[data-settings-group]')).map((group) =>
      Array.from(group.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent?.trim()),
    );

    expect(groups).toEqual([
      ['Models', 'API', 'Interface & Interaction', 'Data & App'],
      ['Shortcuts'],
      ['About'],
    ]);

    for (const group of document.querySelectorAll('[data-settings-group]')) {
      expect(group.className).not.toContain('border-l');
      expect(group.className).not.toContain('border-t');
      expect(group.className).not.toContain('ml-1');
      expect(group.className).not.toContain('pl-2');
      expect(group.className).not.toContain('pt-3');
    }
  });

  it('routes scoped chat changes to current chat settings', async () => {
    const onSave = vi.fn();
    const onSaveCurrentChatSettings = vi.fn();

    await act(async () => {
      localStorage.setItem('chatSettingsLastTab', 'models');
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <WindowProvider>
          <I18nProvider>
            <SettingsModal
              isOpen
              onClose={vi.fn()}
              currentSettings={{
                ...DEFAULT_APP_SETTINGS,
                modelId: 'default-model',
              }}
              currentChatSettings={{
                ...DEFAULT_CHAT_SETTINGS,
                modelId: 'current-model',
              }}
              hasActiveSession
              availableModels={[
                { id: 'current-model', name: 'Current Model' },
                { id: 'next-chat-model', name: 'Next Chat Model' },
              ]}
              onSave={onSave}
              onSaveCurrentChatSettings={onSaveCurrentChatSettings}
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
              t={(key) => key}
            />
          </I18nProvider>
        </WindowProvider>,
      );
    });

    await act(async () => {
      Array.from(document.querySelectorAll('button'))
        .find((button) => button.textContent === 'settingsScopeCurrentChat')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      document
        .querySelector('[data-testid="settings-model-option-next-chat-model"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSaveCurrentChatSettings).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'next-chat-model' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the scope toggle only on chat-scoped settings tabs', async () => {
    await act(async () => {
      localStorage.setItem('chatSettingsLastTab', 'models');
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <WindowProvider>
          <I18nProvider>
            <SettingsModal
              isOpen
              onClose={vi.fn()}
              currentSettings={DEFAULT_APP_SETTINGS}
              currentChatSettings={DEFAULT_CHAT_SETTINGS}
              hasActiveSession
              availableModels={[]}
              onSave={vi.fn()}
              onSaveCurrentChatSettings={vi.fn()}
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
              t={(key) => key}
            />
          </I18nProvider>
        </WindowProvider>,
      );
    });

    expect(document.body.textContent).toContain('settingsScopeCurrentChat');

    await act(async () => {
      Array.from(document.querySelectorAll('[role="tab"]'))
        .find((tab) => tab.textContent?.includes('settingsTabInterface'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).not.toContain('settingsScopeCurrentChat');
  });
});
