import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';

const {
  mockGetApiUsageByTimeRange,
  mockPruneLogs,
  mockAddLogs,
  mockClearLogs,
  mockAddApiUsageRecord,
  mockGetLogs,
  mockClearApiUsage,
} = vi.hoisted(() => ({
  mockGetApiUsageByTimeRange: vi.fn(),
  mockPruneLogs: vi.fn(),
  mockAddLogs: vi.fn(),
  mockClearLogs: vi.fn(),
  mockAddApiUsageRecord: vi.fn(),
  mockGetLogs: vi.fn(),
  mockClearApiUsage: vi.fn(),
}));

vi.mock('../../../utils/db', () => ({
  dbService: {
    getApiUsageByTimeRange: mockGetApiUsageByTimeRange,
    pruneLogs: mockPruneLogs,
    addLogs: mockAddLogs,
    clearLogs: mockClearLogs,
    addApiUsageRecord: mockAddApiUsageRecord,
    getLogs: mockGetLogs,
    clearApiUsage: mockClearApiUsage,
  },
}));

import { UsageSection } from './UsageSection';

describe('UsageSection', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    mockPruneLogs.mockResolvedValue(undefined);
    mockAddLogs.mockResolvedValue(undefined);
    mockClearLogs.mockResolvedValue(undefined);
    mockAddApiUsageRecord.mockResolvedValue(undefined);
    mockGetLogs.mockResolvedValue([]);
    mockClearApiUsage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    useSettingsStore.setState(initialState);
  });

  it('aggregates request counts and per-model token totals for the selected range', async () => {
    mockGetApiUsageByTimeRange.mockResolvedValue([
      { id: 1, timestamp: Date.now(), modelId: 'gemini-3.1-pro-preview', promptTokens: 1_000_000, completionTokens: 0 },
      { id: 2, timestamp: Date.now() - 1000, modelId: 'gemini-3-flash-preview', promptTokens: 500_000, completionTokens: 500_000 },
      { id: 3, timestamp: Date.now() - 2000, modelId: 'imagen-4.0-generate-001', promptTokens: 10, completionTokens: 20 },
    ]);

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <UsageSection />
        </I18nProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Time Range');
    expect(container.textContent).toContain('All Time');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('1,500,010');
    expect(container.textContent).toContain('500,020');
    expect(container.textContent).toContain('2,000,030');
    expect(container.textContent).toContain('$2.00');
    expect(container.textContent).toContain('gemini-3.1-pro-preview');
    expect(container.textContent).toContain('gemini-3-flash-preview');
    expect(container.textContent).toContain('imagen-4.0-generate-001');
    expect(container.textContent).toContain('$2.00');
    expect(container.textContent).not.toContain('$1.75');
    expect(container.textContent).toContain('—');
    expect(container.textContent).toContain('Strict official mode');
  });
});
