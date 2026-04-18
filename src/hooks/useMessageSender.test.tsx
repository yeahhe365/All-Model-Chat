import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendStandardMessage = vi.fn();
const mockHandleTtsImagenMessage = vi.fn();
const mockHandleImageEditMessage = vi.fn();
const { mockGetModelCapabilities } = vi.hoisted(() => ({
  mockGetModelCapabilities: vi.fn(),
}));

vi.mock('./message-sender/useChatStreamHandler', () => ({
  useChatStreamHandler: () => ({
    getStreamHandlers: vi.fn(),
  }),
}));

vi.mock('./message-sender/useCanvasGenerator', () => ({
  useCanvasGenerator: () => ({
    handleGenerateCanvas: vi.fn(),
  }),
}));

vi.mock('./message-sender/useStandardChat', () => ({
  useStandardChat: () => ({
    sendStandardMessage: mockSendStandardMessage,
  }),
}));

vi.mock('./message-sender/useTtsImagenSender', () => ({
  useTtsImagenSender: () => ({
    handleTtsImagenMessage: mockHandleTtsImagenMessage,
  }),
}));

vi.mock('./message-sender/useImageEditSender', () => ({
  useImageEditSender: () => ({
    handleImageEditMessage: mockHandleImageEditMessage,
  }),
}));

vi.mock('../utils/modelHelpers', () => ({
  getModelCapabilities: mockGetModelCapabilities,
}));

vi.mock('../utils/appUtils', () => ({
  generateUniqueId: vi.fn(() => 'generation-id'),
  getKeyForRequest: vi.fn(() => ({ key: 'api-key', isNewKey: false })),
  logService: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createNewSession: vi.fn(),
}));

import { useMessageSender } from './useMessageSender';

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
      container.remove();
    },
  };
};

describe('useMessageSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: true,
      isFlashImageModel: false,
      isGemini3ImageModel: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks attachments for Imagen models instead of silently ignoring them', async () => {
    const setAppFileError = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageSender({
        appSettings: {
          isAutoScrollOnSendEnabled: true,
          generateQuadImages: false,
        } as any,
        currentChatSettings: {
          modelId: 'imagen-4.0-generate-001',
        } as any,
        messages: [],
        selectedFiles: [
          {
            id: 'file-1',
            name: 'reference.png',
            type: 'image/png',
            size: 123,
            uploadState: 'active',
          } as any,
        ],
        setSelectedFiles: vi.fn(),
        editingMessageId: null,
        setEditingMessageId: vi.fn(),
        setAppFileError,
        aspectRatio: '1:1',
        imageSize: '1K',
        userScrolledUpRef: { current: false },
        activeSessionId: null,
        setActiveSessionId: vi.fn(),
        activeJobs: { current: new Map() },
        updateAndPersistSessions: vi.fn(),
        sessionKeyMapRef: { current: new Map() },
        language: 'zh',
        setSessionLoading: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSendMessage({
        text: 'draw this as a poster',
      });
    });

    expect(setAppFileError).toHaveBeenCalledWith('Imagen models support text prompts only.');
    expect(mockHandleTtsImagenMessage).not.toHaveBeenCalled();
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    expect(mockHandleImageEditMessage).not.toHaveBeenCalled();
    unmount();
  });

  it('blocks Gemini 3 image requests with more than 14 reference images', async () => {
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: true,
    });

    const setAppFileError = vi.fn();
    const selectedFiles = Array.from({ length: 15 }, (_, index) => ({
      id: `file-${index + 1}`,
      name: `reference-${index + 1}.png`,
      type: 'image/png',
      size: 123,
      uploadState: 'active',
    })) as any;

    const { result, unmount } = renderHook(() =>
      useMessageSender({
        appSettings: {
          isAutoScrollOnSendEnabled: true,
          generateQuadImages: false,
        } as any,
        currentChatSettings: {
          modelId: 'gemini-3.1-flash-image-preview',
        } as any,
        messages: [],
        selectedFiles,
        setSelectedFiles: vi.fn(),
        editingMessageId: null,
        setEditingMessageId: vi.fn(),
        setAppFileError,
        aspectRatio: '1:1',
        imageSize: '1K',
        userScrolledUpRef: { current: false },
        activeSessionId: null,
        setActiveSessionId: vi.fn(),
        activeJobs: { current: new Map() },
        updateAndPersistSessions: vi.fn(),
        sessionKeyMapRef: { current: new Map() },
        language: 'zh',
        setSessionLoading: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSendMessage({
        text: 'make a group portrait',
      });
    });

    expect(setAppFileError).toHaveBeenCalledWith(
      'Gemini 3 image models support up to 14 reference images per request.',
    );
    expect(mockHandleTtsImagenMessage).not.toHaveBeenCalled();
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    expect(mockHandleImageEditMessage).not.toHaveBeenCalled();
    unmount();
  });

  it('blocks PDF attachments for Gemini 3 Pro image', async () => {
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: true,
    });

    const setAppFileError = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageSender({
        appSettings: {
          isAutoScrollOnSendEnabled: true,
          generateQuadImages: false,
        } as any,
        currentChatSettings: {
          modelId: 'gemini-3-pro-image-preview',
        } as any,
        messages: [],
        selectedFiles: [
          {
            id: 'file-1',
            name: 'reference.pdf',
            type: 'application/pdf',
            size: 123,
            uploadState: 'active',
          } as any,
        ],
        setSelectedFiles: vi.fn(),
        editingMessageId: null,
        setEditingMessageId: vi.fn(),
        setAppFileError,
        aspectRatio: '1:1',
        imageSize: '1K',
        userScrolledUpRef: { current: false },
        activeSessionId: null,
        setActiveSessionId: vi.fn(),
        activeJobs: { current: new Map() },
        updateAndPersistSessions: vi.fn(),
        sessionKeyMapRef: { current: new Map() },
        language: 'zh',
        setSessionLoading: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSendMessage({
        text: 'turn this into a poster',
      });
    });

    expect(setAppFileError).toHaveBeenCalledWith('This image model supports image attachments only.');
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    expect(mockHandleImageEditMessage).not.toHaveBeenCalled();
    unmount();
  });

  it('allows PDF attachments for Gemini 3.1 Flash image', async () => {
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: true,
    });

    const setAppFileError = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageSender({
        appSettings: {
          isAutoScrollOnSendEnabled: true,
          generateQuadImages: false,
        } as any,
        currentChatSettings: {
          modelId: 'gemini-3.1-flash-image-preview',
        } as any,
        messages: [],
        selectedFiles: [
          {
            id: 'file-1',
            name: 'reference.pdf',
            type: 'application/pdf',
            size: 123,
            uploadState: 'active',
          } as any,
        ],
        setSelectedFiles: vi.fn(),
        editingMessageId: null,
        setEditingMessageId: vi.fn(),
        setAppFileError,
        aspectRatio: '1:1',
        imageSize: '1K',
        userScrolledUpRef: { current: false },
        activeSessionId: null,
        setActiveSessionId: vi.fn(),
        activeJobs: { current: new Map() },
        updateAndPersistSessions: vi.fn(),
        sessionKeyMapRef: { current: new Map() },
        language: 'zh',
        setSessionLoading: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSendMessage({
        text: 'turn this into a cover',
      });
    });

    expect(setAppFileError).toHaveBeenCalledWith(null);
    expect(mockSendStandardMessage).toHaveBeenCalled();
    unmount();
  });
});
