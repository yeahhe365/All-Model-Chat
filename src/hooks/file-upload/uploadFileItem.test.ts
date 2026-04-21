import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import type { UploadedFile } from '../../types';

const {
  uploadFileMock,
  generateUniqueIdMock,
  fileToBlobUrlMock,
} = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  generateUniqueIdMock: vi.fn(),
  fileToBlobUrlMock: vi.fn(),
}));

vi.mock('../../services/geminiService', () => ({
  geminiServiceInstance: {
    uploadFile: uploadFileMock,
  },
}));

vi.mock('../../utils/chat/ids', () => ({
  generateUniqueId: generateUniqueIdMock,
}));

vi.mock('../../utils/fileHelpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/fileHelpers')>();
  return {
    ...actual,
    fileToBlobUrl: fileToBlobUrlMock,
    isTextFile: vi.fn(() => false),
  };
});

vi.mock('../../services/logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { uploadFileItem } from './uploadFileItem';

describe('uploadFileItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateUniqueIdMock.mockReturnValue('file-1');
    fileToBlobUrlMock.mockReturnValue('blob:preview-file-1');
    uploadFileMock.mockResolvedValue({
      name: 'files/test-file',
      uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
    });
  });

  it('keeps uploads with an unspecified backend state in pollable processing', async () => {
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
    let selectedFiles: UploadedFile[] = [];
    const setSelectedFiles = (updater: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => {
      selectedFiles = typeof updater === 'function' ? updater(selectedFiles) : updater;
    };

    await uploadFileItem({
      file,
      keyToUse: 'api-key',
      forceFileApi: true,
      defaultResolution: undefined,
      appSettings: DEFAULT_APP_SETTINGS,
      setSelectedFiles,
      uploadStatsRef: {
        current: new Map<string, { lastLoaded: number; lastTime: number }>(),
      },
    });

    expect(selectedFiles).toEqual([
      expect.objectContaining({
        id: 'file-1',
        name: 'clip.mp4',
        fileApiName: 'files/test-file',
        fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file',
        uploadState: 'processing_api',
        isProcessing: true,
        error: undefined,
      }),
    ]);
  });
});
