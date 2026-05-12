import { act } from 'react';
import { renderHookWithProviders } from '@/test/providerTestUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '@/constants/appConstants';
import type { UploadedFile } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

const { generateUniqueIdMock, getKeyForRequestMock, getFileMetadataMock } = vi.hoisted(() => ({
  generateUniqueIdMock: vi.fn(),
  getKeyForRequestMock: vi.fn(),
  getFileMetadataMock: vi.fn(),
}));

vi.mock('@/utils/chat/ids', () => ({
  generateUniqueId: generateUniqueIdMock,
}));

vi.mock('@/utils/apiUtils', () => ({
  getKeyForRequest: getKeyForRequestMock,
  getGeminiKeyForRequest: getKeyForRequestMock,
  getApiKeyErrorTranslationKey: vi.fn((error: string) =>
    error === 'API Key not configured.' ? 'apiRuntime_keyNotConfigured' : null,
  ),
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

vi.mock('@/services/api/fileApi', () => ({
  getFileMetadataApi: getFileMetadataMock,
}));

import { useFileIdAdder } from './useFileIdAdder';

describe('useFileIdAdder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateUniqueIdMock.mockReturnValue('temp-file-1');
    getKeyForRequestMock.mockReturnValue({ key: 'api-key', isNewKey: false });
    getFileMetadataMock.mockResolvedValue({
      name: 'files/test-file',
      uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
      mimeType: 'video/mp4',
      sizeBytes: '123',
      displayName: 'clip.mp4',
    });
  });

  it('keeps file ids with an unspecified backend state in pollable processing', async () => {
    let selectedFiles: UploadedFile[] = [];
    let appFileError: string | null = null;

    const setSelectedFiles = (updater: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => {
      selectedFiles = typeof updater === 'function' ? updater(selectedFiles) : updater;
    };
    const setAppFileErrorCalls = vi.fn();
    const setAppFileError: Dispatch<SetStateAction<string | null>> = (updater) => {
      appFileError = typeof updater === 'function' ? updater(appFileError) : updater;
      setAppFileErrorCalls(appFileError);
    };
    const setCurrentChatSettings = vi.fn();

    const { result, unmount } = renderHookWithProviders(
      () =>
        useFileIdAdder({
          appSettings: DEFAULT_APP_SETTINGS,
          setSelectedFiles,
          setAppFileError,
          currentChatSettings: DEFAULT_APP_SETTINGS,
          setCurrentChatSettings,
          selectedFiles,
        }),
      { language: 'zh' },
    );

    await act(async () => {
      await result.current.addFileById('files/test-file');
    });

    expect(appFileError).toBeNull();
    expect(selectedFiles).toEqual([
      expect.objectContaining({
        id: 'temp-file-1',
        name: 'clip.mp4',
        fileApiName: 'files/test-file',
        fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
        uploadState: 'processing_api',
        isProcessing: true,
        error: undefined,
      }),
    ]);

    unmount();
  });

  it('shows a localized validation error for malformed file ids', async () => {
    let appFileError: string | null = null;

    const setAppFileError: Dispatch<SetStateAction<string | null>> = (updater) => {
      appFileError = typeof updater === 'function' ? updater(appFileError) : updater;
    };

    const { result, unmount } = renderHookWithProviders(
      () =>
        useFileIdAdder({
          appSettings: DEFAULT_APP_SETTINGS,
          setSelectedFiles: vi.fn(),
          setAppFileError,
          currentChatSettings: DEFAULT_APP_SETTINGS,
          setCurrentChatSettings: vi.fn(),
          selectedFiles: [],
        }),
      { language: 'zh' },
    );

    await act(async () => {
      await result.current.addFileById('bad-id');
    });

    expect(appFileError).toBe('无效的文件 ID 格式。');
    unmount();
  });
});
