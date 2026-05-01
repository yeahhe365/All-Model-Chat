import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeferred } from '@/test/testUtils';

const { mockAddApiUsageRecord, mockAddLogs, mockPruneLogs, mockClearLogs, mockClearApiUsage, mockGetLogs } = vi.hoisted(
  () => ({
    mockAddApiUsageRecord: vi.fn(),
    mockAddLogs: vi.fn(),
    mockPruneLogs: vi.fn(),
    mockClearLogs: vi.fn(),
    mockClearApiUsage: vi.fn(),
    mockGetLogs: vi.fn(),
  }),
);

vi.mock('../utils/db', () => ({
  dbService: {
    addApiUsageRecord: mockAddApiUsageRecord,
    addLogs: mockAddLogs,
    pruneLogs: mockPruneLogs,
    clearLogs: mockClearLogs,
    clearApiUsage: mockClearApiUsage,
    getLogs: mockGetLogs,
  },
}));

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('logService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    mockAddApiUsageRecord.mockResolvedValue(undefined);
    mockAddLogs.mockResolvedValue(undefined);
    mockPruneLogs.mockResolvedValue(undefined);
    mockClearLogs.mockResolvedValue(undefined);
    mockClearApiUsage.mockResolvedValue(undefined);
    mockGetLogs.mockResolvedValue([]);
  });

  it('writes timestamped usage records to IndexedDB when token usage is recorded', async () => {
    const { logService } = await import('./logService');
    mockAddApiUsageRecord.mockClear();

    logService.recordTokenUsage('gemini-3.1-pro-preview', {
      promptTokens: 123,
      cachedPromptTokens: 78,
      completionTokens: 456,
      thoughtTokens: 22,
      toolUsePromptTokens: 17,
      totalTokens: 618,
    });
    await Promise.resolve();

    expect(mockAddApiUsageRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gemini-3.1-pro-preview',
        promptTokens: 123,
        completionTokens: 456,
        cachedPromptTokens: 78,
        thoughtTokens: 22,
        toolUsePromptTokens: 17,
        totalTokens: 618,
        timestamp: expect.any(Number),
      }),
    );
  });

  it('persists exact pricing metadata when usage details are provided', async () => {
    const { logService } = await import('./logService');
    mockAddApiUsageRecord.mockClear();

    logService.recordTokenUsage(
      'gemini-3-flash-preview',
      {
        promptTokens: 123,
        cachedPromptTokens: 23,
        completionTokens: 45,
        totalTokens: 168,
      },
      {
        version: 1,
        requestKind: 'chat',
        promptTokensDetails: [{ modality: 'TEXT', tokenCount: 100 }],
        cacheTokensDetails: [{ modality: 'TEXT', tokenCount: 23 }],
        responseTokensDetails: [{ modality: 'TEXT', tokenCount: 45 }],
      },
    );
    await Promise.resolve();

    expect(mockAddApiUsageRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gemini-3-flash-preview',
        exactPricing: expect.objectContaining({
          version: 1,
          requestKind: 'chat',
          promptTokensDetails: [{ modality: 'TEXT', tokenCount: 100 }],
        }),
      }),
    );
  });

  it('serializes direct Error arguments with message and stack details', async () => {
    const { logService } = await import('./logService');
    await logService.getRecentLogs();
    mockAddLogs.mockClear();

    logService.error('Streaming exploded', new Error('kaput'));
    await logService.getRecentLogs();

    expect(mockAddLogs).toHaveBeenCalledWith([
      expect.objectContaining({
        level: 'ERROR',
        category: 'NETWORK',
        message: 'Streaming exploded',
        data: expect.objectContaining({
          message: 'kaput',
          name: 'Error',
          stack: expect.any(String),
        }),
      }),
    ]);
  });

  it('infers non-system categories when no explicit category is provided', async () => {
    const { logService } = await import('./logService');
    await logService.getRecentLogs();
    mockAddLogs.mockClear();

    logService.warn('Failed to upload file "report.pdf"');
    await logService.getRecentLogs();

    expect(mockAddLogs).toHaveBeenCalledWith([
      expect.objectContaining({
        level: 'WARN',
        category: 'FILE',
      }),
    ]);
  });

  it('requeues failed flush batches so they can be retried later', async () => {
    const { logService } = await import('./logService');
    await logService.getRecentLogs();
    mockAddLogs.mockReset();
    mockGetLogs.mockResolvedValue([]);
    mockAddLogs.mockRejectedValueOnce(new Error('db unavailable')).mockResolvedValueOnce(undefined);

    logService.info('Retry me');
    await logService.getRecentLogs();
    await logService.getRecentLogs();

    expect(mockAddLogs).toHaveBeenCalledTimes(2);
    expect(mockAddLogs.mock.calls[1][0]).toEqual([
      expect.objectContaining({
        message: 'Retry me',
      }),
    ]);
  });

  it('waits for in-flight flushes before clearing and does not recreate logs during clear', async () => {
    const { logService } = await import('./logService');
    await logService.getRecentLogs();
    mockAddLogs.mockReset();
    mockClearLogs.mockClear();
    mockClearApiUsage.mockClear();
    mockGetLogs.mockResolvedValue([]);

    const deferredFlush = createDeferred();
    mockAddLogs.mockReturnValueOnce(deferredFlush.promise);

    logService.info('Pending log before clear');
    const pendingRead = logService.getRecentLogs();
    await flushMicrotasks();

    const clearPromise = logService.clearLogs();
    await flushMicrotasks();

    expect(mockClearLogs).not.toHaveBeenCalled();

    deferredFlush.resolve();
    await pendingRead;
    await clearPromise;

    expect(mockClearLogs).toHaveBeenCalledTimes(1);
    expect(mockClearApiUsage).toHaveBeenCalledTimes(1);
    expect(mockAddLogs).toHaveBeenCalledTimes(1);
  });
});
