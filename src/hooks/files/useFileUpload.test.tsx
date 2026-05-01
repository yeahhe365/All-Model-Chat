import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import type { UploadedFile } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { useFileUpload } from './useFileUpload';
import { createDeferred, renderHook } from '@/test/testUtils';

const { mockUploadFileItem } = vi.hoisted(() => ({
  mockUploadFileItem: vi.fn(),
}));

vi.mock('../file-upload/uploadFileItem', () => ({
  uploadFileItem: mockUploadFileItem,
}));

vi.mock('../../services/logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/db', () => ({
  dbService: {
    getAllSessionMetadata: vi.fn().mockResolvedValue([]),
    getSession: vi.fn().mockResolvedValue(null),
    getAllGroups: vi.fn().mockResolvedValue([]),
    saveSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    setAllGroups: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      activeSessionId: 'session-1',
      selectedFiles: [],
    });
  });

  it('ignores async file writes after the active session changes', async () => {
    const deferred = createDeferred();
    let selectedFiles: UploadedFile[] = [];
    const setSelectedFiles = vi.fn((updater: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => {
      selectedFiles = typeof updater === 'function' ? updater(selectedFiles) : updater;
    });

    mockUploadFileItem.mockImplementation(async ({ setSelectedFiles: writeSelectedFiles }) => {
      await deferred.promise;
      writeSelectedFiles((prev: UploadedFile[]) => [
        ...prev,
        {
          id: 'late-file',
          name: 'late.png',
          type: 'image/png',
          size: 1,
          isProcessing: false,
          uploadState: 'active',
        },
      ]);
    });

    const { result, unmount } = renderHook(() =>
      useFileUpload({
        appSettings: DEFAULT_APP_SETTINGS,
        selectedFiles,
        setSelectedFiles,
        setAppFileError: vi.fn(),
        currentChatSettings: DEFAULT_APP_SETTINGS,
        setCurrentChatSettings: vi.fn(),
      }),
    );

    let uploadPromise: Promise<void>;
    await act(async () => {
      uploadPromise = result.current.handleProcessAndAddFiles([new File(['x'], 'late.png', { type: 'image/png' })]);
      await Promise.resolve();
    });

    act(() => {
      useChatStore.getState().setActiveSessionId('session-2');
    });

    await act(async () => {
      deferred.resolve();
      await uploadPromise!;
    });

    expect(selectedFiles).toEqual([]);
    unmount();
  });

  it('ignores async file writes after file operations are invalidated in the same session', async () => {
    const deferred = createDeferred();
    let selectedFiles: UploadedFile[] = [];
    const setSelectedFiles = vi.fn((updater: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => {
      selectedFiles = typeof updater === 'function' ? updater(selectedFiles) : updater;
    });

    mockUploadFileItem.mockImplementation(async ({ setSelectedFiles: writeSelectedFiles }) => {
      await deferred.promise;
      writeSelectedFiles((prev: UploadedFile[]) => [
        ...prev,
        {
          id: 'late-file',
          name: 'late.png',
          type: 'image/png',
          size: 1,
          isProcessing: false,
          uploadState: 'active',
        },
      ]);
    });

    const { result, unmount } = renderHook(() =>
      useFileUpload({
        appSettings: DEFAULT_APP_SETTINGS,
        selectedFiles,
        setSelectedFiles,
        setAppFileError: vi.fn(),
        currentChatSettings: DEFAULT_APP_SETTINGS,
        setCurrentChatSettings: vi.fn(),
      }),
    );

    let uploadPromise: Promise<void>;
    await act(async () => {
      uploadPromise = result.current.handleProcessAndAddFiles([new File(['x'], 'late.png', { type: 'image/png' })]);
      await Promise.resolve();
    });

    act(() => {
      (useChatStore.getState() as any).invalidateFileOperations?.();
    });

    await act(async () => {
      deferred.resolve();
      await uploadPromise!;
    });

    expect(selectedFiles).toEqual([]);
    unmount();
  });
});
