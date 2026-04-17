import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAddApiUsageRecord,
  mockAddLogs,
  mockPruneLogs,
  mockClearLogs,
  mockGetLogs,
} = vi.hoisted(() => ({
  mockAddApiUsageRecord: vi.fn(),
  mockAddLogs: vi.fn(),
  mockPruneLogs: vi.fn(),
  mockClearLogs: vi.fn(),
  mockGetLogs: vi.fn(),
}));

vi.mock('../utils/db', () => ({
  dbService: {
    addApiUsageRecord: mockAddApiUsageRecord,
    addLogs: mockAddLogs,
    pruneLogs: mockPruneLogs,
    clearLogs: mockClearLogs,
    getLogs: mockGetLogs,
  },
}));

describe('logService token usage capture', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    mockAddApiUsageRecord.mockResolvedValue(undefined);
    mockAddLogs.mockResolvedValue(undefined);
    mockPruneLogs.mockResolvedValue(undefined);
    mockClearLogs.mockResolvedValue(undefined);
    mockGetLogs.mockResolvedValue([]);
  });

  it('writes timestamped usage records to IndexedDB when token usage is recorded', async () => {
    const { logService } = await import('./logService');
    mockAddApiUsageRecord.mockClear();

    logService.recordTokenUsage('gemini-3.1-pro-preview', 123, 456);
    await Promise.resolve();

    expect(mockAddApiUsageRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gemini-3.1-pro-preview',
        promptTokens: 123,
        completionTokens: 456,
        timestamp: expect.any(Number),
      }),
    );
  });
});
