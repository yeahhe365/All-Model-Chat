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

vi.mock('../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

vi.mock('../../utils/db', async () => {
  const { createDbServiceMockModule } = await import('../../test/moduleMockDoubles');

  return createDbServiceMockModule();
});

vi.mock('../../contexts/I18nContext', async () => {
  const { createI18nMockModule } = await import('../../test/moduleMockDoubles');

  return createI18nMockModule();
});

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
      useChatStore.getState().invalidateFileOperations();
    });

    await act(async () => {
      deferred.resolve();
      await uploadPromise!;
    });

    expect(selectedFiles).toEqual([]);
    unmount();
  });
});
