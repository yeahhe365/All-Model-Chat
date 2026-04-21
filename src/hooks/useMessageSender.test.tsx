import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendStandardMessage = vi.fn();
const mockHandleTtsImagenMessage = vi.fn();
const mockHandleImageEditMessage = vi.fn();
const { mockGetModelCapabilities, mockCreateNewSession } = vi.hoisted(() => ({
  mockGetModelCapabilities: vi.fn(),
  mockCreateNewSession: vi.fn(),
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
  createNewSession: mockCreateNewSession,
}));

vi.mock('../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        messageSender_waitForFiles: '请等待文件处理完成。',
        messageSender_imageModelSupportsImageOnly: '这个图片模型仅支持图片附件。',
        messageSender_imageModelSupportsImageAndPdfOnly: 'Nano Banana 2 仅支持图片和 PDF 附件。',
        messageSender_imageReferenceLimit: 'Gemini 3 图片模型每次请求最多支持 14 张参考图。',
        messageSender_imagenTextOnly: 'Imagen 模型仅支持文本提示词。',
        messageSender_noModelSelected: '未选择模型。',
        messageSender_errorSessionTitle: '错误',
        messageSender_apiKeyErrorSessionTitle: 'API 密钥错误',
        apiRuntime_keyNotConfigured: 'API 密钥未配置。',
        apiRuntime_noValidKeysFound: '未找到有效的 API 密钥。',
      })[key] ?? key,
  }),
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
    mockCreateNewSession.mockReturnValue({ id: 'new-session' });
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
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
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

    expect(setAppFileError).toHaveBeenCalledWith('Imagen 模型仅支持文本提示词。');
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
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
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
      'Gemini 3 图片模型每次请求最多支持 14 张参考图。',
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
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
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

    expect(setAppFileError).toHaveBeenCalledWith('这个图片模型仅支持图片附件。');
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
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
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

  it('creates a localized error session when no model is selected', async () => {
    const setActiveSessionId = vi.fn();
    const updateAndPersistSessions = vi.fn((updater) => updater([]));

    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: false,
    });

    const { result, unmount } = renderHook(() =>
      useMessageSender({
        appSettings: {
          isAutoScrollOnSendEnabled: true,
          generateQuadImages: false,
        } as any,
        currentChatSettings: {
          modelId: '',
        } as any,
        messages: [],
        selectedFiles: [],
        setSelectedFiles: vi.fn(),
        editingMessageId: null,
        setEditingMessageId: vi.fn(),
        setAppFileError: vi.fn(),
        aspectRatio: '1:1',
        imageSize: '1K',
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
        userScrolledUpRef: { current: false },
        activeSessionId: null,
        setActiveSessionId,
        activeJobs: { current: new Map() },
        updateAndPersistSessions,
        sessionKeyMapRef: { current: new Map() },
        language: 'zh',
        setSessionLoading: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSendMessage({ text: 'hello' });
    });

    expect(mockCreateNewSession).toHaveBeenCalledWith(
      expect.anything(),
      [
        expect.objectContaining({
          role: 'error',
          content: '未选择模型。',
        }),
      ],
      '错误',
    );
    expect(setActiveSessionId).toHaveBeenCalledWith('new-session');
    unmount();
  });
});
