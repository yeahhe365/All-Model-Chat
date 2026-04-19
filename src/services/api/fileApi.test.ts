import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfiguredApiClientMock, uploadMock } = vi.hoisted(() => ({
  getConfiguredApiClientMock: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock('./baseApi', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
}));

vi.mock('../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

import { uploadFileApi } from './fileApi';

describe('uploadFileApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfiguredApiClientMock.mockResolvedValue({
      files: {
        upload: uploadMock,
      },
    });
    uploadMock.mockResolvedValue({ name: 'files/test-file' });
  });

  it('forwards the abort signal to the SDK upload config', async () => {
    const file = new File(['hello'], 'sample.txt', { type: 'text/plain' });
    const controller = new AbortController();

    await uploadFileApi(
      'api-key',
      file,
      'text/plain',
      'sample.txt',
      controller.signal,
    );

    expect(uploadMock).toHaveBeenCalledWith({
      file,
      config: {
        displayName: 'sample.txt',
        mimeType: 'text/plain',
        abortSignal: controller.signal,
      },
    });
  });
});
