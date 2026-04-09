import React, { useState } from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileIdAdder } from '../useFileIdAdder';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import { ChatSettings, MediaResolution, UploadedFile } from '../../../types';

const mockGetFileMetadata = vi.fn();

vi.mock('../../../utils/appUtils', () => ({
  generateUniqueId: vi.fn(() => 'temp-file-id'),
  getKeyForRequest: vi.fn(() => ({ key: 'test-key', isNewKey: false })),
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../services/geminiService', () => ({
  geminiServiceInstance: {
    getFileMetadata: (...args: unknown[]) => mockGetFileMetadata(...args),
  },
}));

describe('useFileIdAdder', () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  beforeEach(() => {
    mockGetFileMetadata.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('falls back to safe defaults when Files API metadata is missing mimeType and name', async () => {
    mockGetFileMetadata.mockResolvedValue({
      uri: 'files/uri-1',
      state: 'ACTIVE',
      sizeBytes: '12',
    });

    const latestHookRef: { current: ReturnType<typeof useFileIdAdder> | null } = { current: null };
    const latestFilesRef: { current: UploadedFile[] } = { current: [] };

    const HookHarness = () => {
      const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
      const [appFileError, setAppFileError] = useState<string | null>(null);
      const [currentChatSettings, setCurrentChatSettings] = useState<ChatSettings>({
        ...DEFAULT_CHAT_SETTINGS,
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
      });

      React.useEffect(() => {
        latestFilesRef.current = selectedFiles;
      }, [selectedFiles]);
      void appFileError;
      void currentChatSettings;

      const hook = useFileIdAdder({
        appSettings: {
          ...DEFAULT_CHAT_SETTINGS,
          filesApiConfig: {
            images: true,
            pdfs: true,
            audio: true,
            video: true,
            text: true,
          },
        } as any,
        setSelectedFiles,
        setAppFileError,
        currentChatSettings,
        setCurrentChatSettings,
        selectedFiles,
      });
      React.useEffect(() => {
        latestHookRef.current = hook;
      }, [hook]);

      return null;
    };

    act(() => {
      root.render(<HookHarness />);
    });

    await act(async () => {
      await latestHookRef.current?.addFileById('files/abc123');
    });

    expect(latestFilesRef.current).toHaveLength(1);
    expect(latestFilesRef.current[0]).toMatchObject({
      id: 'temp-file-id',
      name: 'files/abc123',
      type: 'application/octet-stream',
      fileApiName: 'files/abc123',
      fileUri: 'files/uri-1',
      uploadState: 'active',
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
    });
  });
});
