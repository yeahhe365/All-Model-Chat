import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { DataManagementSection } from './DataManagementSection';

describe('DataManagementSection', () => {
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

  it('updates translated actions from the global i18n context', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <DataManagementSection
            onClearHistory={vi.fn()}
            onClearCache={vi.fn()}
            onOpenLogViewer={vi.fn()}
            onClearLogs={vi.fn()}
            installState="installed"
            onInstallPwa={vi.fn()}
            onImportSettings={vi.fn()}
            onExportSettings={vi.fn()}
            onImportHistory={vi.fn()}
            onExportHistory={vi.fn()}
            onImportScenarios={vi.fn()}
            onExportScenarios={vi.fn()}
            onReset={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('View Logs and Usage');
    expect(container.textContent).toContain('Export');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(container.textContent).toContain('查看日志和用量');
    expect(container.textContent).toContain('导出');
  });

  it('keeps the install action enabled when manual browser guidance is needed', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <DataManagementSection
            onClearHistory={vi.fn()}
            onClearCache={vi.fn()}
            onOpenLogViewer={vi.fn()}
            onClearLogs={vi.fn()}
            installState="manual"
            onInstallPwa={vi.fn()}
            onImportSettings={vi.fn()}
            onExportSettings={vi.fn()}
            onImportHistory={vi.fn()}
            onExportHistory={vi.fn()}
            onImportScenarios={vi.fn()}
            onExportScenarios={vi.fn()}
            onReset={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    const installButton = container.querySelector('button[aria-label="Install Progressive Web App"]');

    expect(installButton?.hasAttribute('disabled')).toBe(false);
    expect(container.textContent).toContain('Use your browser menu to install this app.');
  });
});
