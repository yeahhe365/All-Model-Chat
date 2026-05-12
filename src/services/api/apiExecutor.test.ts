import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfiguredApiClientMock, infoMock, errorMock } = vi.hoisted(() => ({
  getConfiguredApiClientMock: vi.fn(),
  infoMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock('./apiClient', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule({ error: errorMock, info: infoMock });
});

import { executeConfiguredApiRequest } from './apiExecutor';

describe('executeConfiguredApiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfiguredApiClientMock.mockResolvedValue({ models: {} });
  });

  it('gets the configured API client once and logs the request label', async () => {
    const result = await executeConfiguredApiRequest({
      apiKey: 'api-key',
      label: 'Generate thing',
      run: async ({ client }) => client,
    });

    expect(result).toEqual({ models: {} });
    expect(getConfiguredApiClientMock).toHaveBeenCalledTimes(1);
    expect(getConfiguredApiClientMock).toHaveBeenCalledWith('api-key', undefined);
    expect(infoMock).toHaveBeenCalledWith('Generate thing');
  });

  it('throws AbortError before creating a client when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      executeConfiguredApiRequest({
        apiKey: 'api-key',
        label: 'Generate thing',
        abortSignal: controller.signal,
        run: async () => 'unreachable',
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(getConfiguredApiClientMock).not.toHaveBeenCalled();
  });

  it('logs and rethrows operation failures', async () => {
    const failure = new Error('network down');

    await expect(
      executeConfiguredApiRequest({
        apiKey: 'api-key',
        label: 'Generate thing',
        errorLabel: 'Generate thing failed',
        run: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);

    expect(errorMock).toHaveBeenCalledWith('Generate thing failed', failure);
  });
});
