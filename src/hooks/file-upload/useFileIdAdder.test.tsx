import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import type { UploadedFile } from '../../types';
import type { Dispatch, SetStateAction } from 'react';

const { generateUniqueIdMock, getKeyForRequestMock, getFileMetadataMock } = vi.hoisted(() => ({
  generateUniqueIdMock: vi.fn(),
  getKeyForRequestMock: vi.fn(),
  getFileMetadataMock: vi.fn(),
}));

vi.mock('../../utils/chat/ids', () => ({
  generateUniqueId: generateUniqueIdMock,
}));

vi.mock('../../utils/apiUtils', () => ({
  getKeyForRequest: getKeyForRequestMock,
  getApiKeyErrorTranslationKey: vi.fn((error: string) =>
    error === 'API Key not configured.' ? 'apiRuntime_keyNotConfigured' : null,
  ),
}));

vi.mock('../../services/logService', async () => {
  const { createMockLogService } = await import('../../test/serviceTestDoubles');

  return { logService: createMockLogService() };
});

vi.mock('../../services/api/fileApi', () => ({
  getFileMetadataApi: getFileMetadataMock,
}));

vi.mock('../../contexts/I18nContext', async () => {
  const { createI18nMock } = await import('../../test/i18nTestDoubles');

  return createI18nMock({
    t: (key: string) =>
      ({
        fileIdAdder_invalidFileId: '无效的文件 ID 格式。',
        fileIdAdder_duplicateFile: '文件 files/test-file 已经添加过了。',
        fileIdAdder_loadingFile: '正在加载 files/test-file...',
        fileIdAdder_notFound: '找不到文件 files/test-file，或您无权访问。',
        fileIdAdder_notFoundShort: '文件不存在。',
        fileIdAdder_notFoundLabel: '未找到：files/test-file',
        apiRuntime_keyNotConfigured: 'API 密钥未配置。',
      })[key] ?? key,
  });
});

import { useFileIdAdder } from './useFileIdAdder';
import { renderHook } from '@/test/testUtils';

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

  afterEach(() => {});

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

    const { result, unmount } = renderHook(() =>
      useFileIdAdder({
        appSettings: DEFAULT_APP_SETTINGS,
        setSelectedFiles,
        setAppFileError,
        currentChatSettings: DEFAULT_APP_SETTINGS,
        setCurrentChatSettings,
        selectedFiles,
      }),
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

    const { result, unmount } = renderHook(() =>
      useFileIdAdder({
        appSettings: DEFAULT_APP_SETTINGS,
        setSelectedFiles: vi.fn(),
        setAppFileError,
        currentChatSettings: DEFAULT_APP_SETTINGS,
        setCurrentChatSettings: vi.fn(),
        selectedFiles: [],
      }),
    );

    await act(async () => {
      await result.current.addFileById('bad-id');
    });

    expect(appFileError).toBe('无效的文件 ID 格式。');
    unmount();
  });
});
