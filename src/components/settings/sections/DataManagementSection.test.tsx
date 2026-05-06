import { act } from 'react';
import type { ComponentProps } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../../stores/settingsStore';
import { setupStoreStateReset } from '../../../test/storeTestUtils';
import { DataManagementSection } from './DataManagementSection';

const { estimateAppDataSizeMock } = vi.hoisted(() => ({
  estimateAppDataSizeMock: vi.fn(),
}));

vi.mock('@/services/db/dbService', async () => {
  const { createDbServiceMockModule } = await import('../../../test/moduleMockDoubles');

  return createDbServiceMockModule({
    estimateAppDataSize: estimateAppDataSizeMock,
  });
});

describe('DataManagementSection', () => {
  const renderer = setupTestRenderer();
  setupStoreStateReset();

  const createDataManagementProps = (
    overrides: Partial<ComponentProps<typeof DataManagementSection>> = {},
  ): ComponentProps<typeof DataManagementSection> => ({
    onClearHistory: vi.fn(),
    onClearCache: vi.fn(),
    onOpenLogViewer: vi.fn(),
    onClearLogs: vi.fn(),
    installState: 'installed',
    onInstallPwa: vi.fn(),
    onImportSettings: vi.fn(),
    onExportSettings: vi.fn(),
    onImportHistory: vi.fn(),
    onExportHistory: vi.fn(),
    onImportScenarios: vi.fn(),
    onExportScenarios: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  });

  const renderDataManagementSection = async (
    overrides: Partial<ComponentProps<typeof DataManagementSection>> & { language?: 'en' | 'zh' } = {},
  ) => {
    const { language = 'en', ...props } = overrides;

    await act(async () => {
      useSettingsStore.setState({ language });
      renderer.root.render(<DataManagementSection {...createDataManagementProps(props)} />);
    });
  };

  beforeEach(() => {
    estimateAppDataSizeMock.mockReset();
  });

  it('updates translated actions from the global i18n context', async () => {
    await renderDataManagementSection();

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
    await renderDataManagementSection({ installState: 'manual' });

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

    await renderDataManagementSection();

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
