import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import type { UploadedFile } from '../../types';
import type { Dispatch, SetStateAction } from 'react';

const {
  generateUniqueIdMock,
  getKeyForRequestMock,
  getFileMetadataMock,
} = vi.hoisted(() => ({
  generateUniqueIdMock: vi.fn(),
  getKeyForRequestMock: vi.fn(),
  getFileMetadataMock: vi.fn(),
}));

vi.mock('../../utils/appUtils', () => ({
  generateUniqueId: generateUniqueIdMock,
  getKeyForRequest: getKeyForRequestMock,
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/geminiService', () => ({
  geminiServiceInstance: {
    getFileMetadata: getFileMetadataMock,
  },
}));

import { useFileIdAdder } from './useFileIdAdder';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe('useFileIdAdder', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
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

  afterEach(() => {
    document.body.innerHTML = '';
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
});
