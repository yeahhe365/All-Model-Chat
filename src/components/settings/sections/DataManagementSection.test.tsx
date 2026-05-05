import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { DataManagementSection } from './DataManagementSection';

const { estimateAppDataSizeMock } = vi.hoisted(() => ({
  estimateAppDataSizeMock: vi.fn(),
}));

vi.mock('../../../utils/db', async () => {
  const { createDbServiceMockModule } = await import('../../../test/moduleMockDoubles');

  return createDbServiceMockModule({
    estimateAppDataSize: estimateAppDataSizeMock,
  });
});

describe('DataManagementSection', () => {
  const renderer = setupTestRenderer();
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    estimateAppDataSizeMock.mockReset();
  });

  afterEach(() => {
    useSettingsStore.setState(initialState);
  });

  it('updates translated actions from the global i18n context', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
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

    expect(renderer.container.textContent).toContain('Open Logs & Usage');
    expect(renderer.container.textContent).toContain('Destructive Actions');
    expect(renderer.container.textContent).toContain('Export');

    act(() => {
      useSettingsStore.setState({ language: 'zh' });
    });

    expect(renderer.container.textContent).toContain('打开日志与用量');
    expect(renderer.container.textContent).toContain('高风险操作');
    expect(renderer.container.textContent).toContain('导出');
  });

  it('keeps the install action enabled when manual browser guidance is needed', async () => {
    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
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

    const installButton = renderer.container.querySelector('button[aria-label="Install Progressive Web App"]');

    expect(installButton?.hasAttribute('disabled')).toBe(false);
    expect(renderer.container.textContent).toContain('Use your browser menu to install this app.');
  });

  it('shows the current local app data size and offers a refresh action', async () => {
    estimateAppDataSizeMock.mockResolvedValue({
      totalBytes: 2048,
      indexedDbBytes: 1536,
      localStorageBytes: 512,
    });

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      renderer.root.render(
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

    await vi.waitFor(() => {
      expect(renderer.container.textContent).toContain('Current Local App Data');
      expect(renderer.container.textContent).toContain('2.0 KB');
    });

    const refreshButtons = Array.from(renderer.container.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes('Refresh'),
    );

    expect(refreshButtons).toHaveLength(1);
  });
});
