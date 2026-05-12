import { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/providerTestUtils';
import { createAppSettings, createChatSettings, createUploadedFile } from '@/test/factories';
import { flushPromises } from '@/test/testUtils';
import { useFilePolling } from './useFilePolling';

const { getFileMetadataApiMock, getGeminiKeyForRequestMock } = vi.hoisted(() => ({
  getFileMetadataApiMock: vi.fn(),
  getGeminiKeyForRequestMock: vi.fn(),
}));

vi.mock('@/services/api/fileApi', () => ({
  getFileMetadataApi: getFileMetadataApiMock,
}));

vi.mock('@/utils/apiUtils', () => ({
  getApiKeyErrorTranslationKey: vi.fn(() => null),
  getGeminiKeyForRequest: getGeminiKeyForRequestMock,
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

describe('useFilePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    getGeminiKeyForRequestMock.mockReturnValue({ key: 'api-key', isNewKey: false });
    getFileMetadataApiMock.mockResolvedValue({ state: 'PROCESSING' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restarts polling for processing files after selected files change', async () => {
    const processingFile = createUploadedFile({
      id: 'file-processing',
      name: 'video.mp4',
      type: 'video/mp4',
      uploadState: 'processing_api',
      isProcessing: true,
      fileApiName: 'files/video-123',
    });
    const setSelectedFiles = vi.fn();

    const { rerender, unmount } = renderHookWithProviders(
      () =>
        useFilePolling({
          appSettings: createAppSettings(),
          selectedFiles: [processingFile],
          setSelectedFiles,
          currentChatSettings: createChatSettings(),
        }),
      { language: 'en' },
    );

    await act(async () => {
      await flushPromises();
    });

    expect(getFileMetadataApiMock).toHaveBeenCalledTimes(1);

    rerender(() =>
      useFilePolling({
        appSettings: createAppSettings(),
        selectedFiles: [
          processingFile,
          createUploadedFile({
            id: 'file-ready',
            name: 'ready.png',
            type: 'image/png',
            uploadState: 'active',
            isProcessing: false,
          }),
        ],
        setSelectedFiles,
        currentChatSettings: createChatSettings(),
      }),
    );

    await act(async () => {
      await flushPromises();
    });

    expect(getFileMetadataApiMock).toHaveBeenCalledTimes(2);
    unmount();
  });
});
