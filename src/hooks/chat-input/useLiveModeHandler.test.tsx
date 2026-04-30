import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedFile } from '../../types';
import { MediaResolution } from '../../types/settings';
import { useLiveModeHandler } from './useLiveModeHandler';

const { mockBuildContentParts } = vi.hoisted(() => ({
  mockBuildContentParts: vi.fn(),
}));

vi.mock('../../utils/chat/builder', () => ({
  buildContentParts: mockBuildContentParts,
}));

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

const makeFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'file-1',
  name: 'clip.mp4',
  type: 'video/mp4',
  size: 100,
  uploadState: 'active',
  ...overrides,
});

describe('useLiveModeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildContentParts.mockResolvedValue({
      contentParts: [{ text: 'hello' }, { fileData: { mimeType: 'video/mp4', fileUri: 'files/clip' } }],
      enrichedFiles: [makeFile({ fileUri: 'files/clip' })],
    });
  });

  it('routes non-live messages to the standard sender', async () => {
    const onSendMessage = vi.fn();
    const liveAPI = {
      isConnected: false,
      connect: vi.fn(),
      sendText: vi.fn(),
      sendContent: vi.fn(),
    };

    const { result, unmount } = renderHook(() =>
      useLiveModeHandler({
        isNativeAudioModel: false,
        selectedFiles: [],
        setSelectedFiles: vi.fn(),
        currentModelId: 'gemini-3.1-pro',
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
        liveAPI,
        onAddUserMessage: vi.fn(),
        onSendMessage,
      }),
    );

    await act(async () => {
      await result.current.handleSmartSendMessage('hello', { isFastMode: true });
    });

    expect(onSendMessage).toHaveBeenCalledWith('hello', { isFastMode: true });
    expect(liveAPI.connect).not.toHaveBeenCalled();
    expect(liveAPI.sendText).not.toHaveBeenCalled();
    unmount();
  });

  it('connects live mode, sends built file content, records the user turn, and clears attachments', async () => {
    const files = [makeFile()];
    const setSelectedFiles = vi.fn();
    const onAddUserMessage = vi.fn();
    const liveAPI = {
      isConnected: false,
      connect: vi.fn().mockResolvedValue(true),
      sendText: vi.fn(),
      sendContent: vi.fn().mockResolvedValue(true),
    };

    const { result, unmount } = renderHook(() =>
      useLiveModeHandler({
        isNativeAudioModel: true,
        selectedFiles: files,
        setSelectedFiles,
        currentModelId: 'gemini-3.1-flash-live',
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
        liveAPI,
        onAddUserMessage,
        onSendMessage: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSmartSendMessage('hello');
    });

    expect(liveAPI.connect).toHaveBeenCalledTimes(1);
    expect(mockBuildContentParts).toHaveBeenCalledWith(
      'hello',
      files,
      'gemini-3.1-flash-live',
      MediaResolution.MEDIA_RESOLUTION_LOW,
    );
    expect(liveAPI.sendContent).toHaveBeenCalledWith([
      { text: 'hello' },
      { fileData: { mimeType: 'video/mp4', fileUri: 'files/clip' } },
    ]);
    expect(onAddUserMessage).toHaveBeenCalledWith('hello', [makeFile({ fileUri: 'files/clip' })]);
    expect(setSelectedFiles).toHaveBeenCalledWith([]);
    unmount();
  });
});
