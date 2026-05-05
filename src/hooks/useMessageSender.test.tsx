import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendStandardMessage = vi.fn();
const mockHandleTtsImagenMessage = vi.fn();
const mockHandleImageEditMessage = vi.fn();
const { mockGetModelCapabilities, mockCreateMessage, mockCreateNewSession } = vi.hoisted(() => ({
  mockGetModelCapabilities: vi.fn(),
  mockCreateMessage: vi.fn((role: string, content: string, options?: Record<string, unknown>) => ({
    id: 'error-message-id',
    role,
    content,
    timestamp: new Date('2026-05-04T09:30:00.000Z'),
    ...options,
  })),
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

vi.mock('../utils/chat/ids', () => ({
  generateUniqueId: vi.fn(() => 'generation-id'),
}));

vi.mock('../utils/apiUtils', () => ({
  getKeyForRequest: vi.fn(() => ({ key: 'api-key', isNewKey: false })),
  getApiKeyErrorTranslationKey: vi.fn((error: string) => {
    if (error === 'API Key not configured.') return 'apiRuntime_keyNotConfigured';
    if (error === 'No valid API keys found.') return 'apiRuntime_noValidKeysFound';
    return null;
  }),
}));

vi.mock('../utils/chat/session', () => ({
  createMessage: mockCreateMessage,
  createNewSession: mockCreateNewSession,
}));

vi.mock('../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

vi.mock('../contexts/I18nContext', async () => {
  const { createI18nMockModule } = await import('../test/moduleMockDoubles');

  return createI18nMockModule({
    t: (key: string) =>
      ({
        messageSender_waitForFiles: '请等待文件处理完成。',
        messageSender_fileUploadFailedBeforeSend: '附件上传失败。请移除失败文件或重新上传后再发送。',
        messageSender_imageModelSupportsImageOnly: '这个图片模型仅支持图片附件。',
        messageSender_imageModelSupportsImageAndPdfOnly: 'Nano Banana 2 仅支持图片和 PDF 附件。',
        messageSender_imageReferenceLimit: 'Gemini 3 图片模型每次请求最多支持 14 张参考图。',
        messageSender_imagenTextOnly: 'Imagen 模型仅支持文本提示词。',
        messageSender_codeExecutionTextFileTooLarge: '代码执行文本/CSV 文件建议不超过 2MB。请拆分文件或关闭代码执行。',
        messageSender_noModelSelected: '未选择模型。',
        messageSender_errorSessionTitle: '错误',
        messageSender_apiKeyErrorSessionTitle: 'API 密钥错误',
        apiRuntime_keyNotConfigured: 'API 密钥未配置。',
        apiRuntime_noValidKeysFound: '未找到有效的 API 密钥。',
      })[key] ?? key,
  });
});

import { useMessageSender } from './useMessageSender';
import { createMessageSenderProps, type MessageSenderPropsOverrides } from '@/test/hookFactories';
import { createUploadedFile } from '@/test/factories';
import { renderHook } from '@/test/testUtils';

describe('useMessageSender', () => {
  const renderMessageSender = (overrides: MessageSenderPropsOverrides = {}) =>
    renderHook(() => useMessageSender(createMessageSenderProps({ language: 'zh', ...overrides })));

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

    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: 'imagen-4.0-generate-001',
      },
      selectedFiles: [
        createUploadedFile({
          name: 'reference.png',
          type: 'image/png',
        }),
      ],
      setAppFileError,
    });

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
    const selectedFiles = Array.from({ length: 15 }, (_, index) =>
      createUploadedFile({
        id: `file-${index + 1}`,
        name: `reference-${index + 1}.png`,
        type: 'image/png',
      }),
    );

    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: 'gemini-3.1-flash-image-preview',
      },
      selectedFiles,
      setAppFileError,
    });

    await act(async () => {
      await result.current.handleSendMessage({
        text: 'make a group portrait',
      });
    });

    expect(setAppFileError).toHaveBeenCalledWith('Gemini 3 图片模型每次请求最多支持 14 张参考图。');
    expect(mockHandleTtsImagenMessage).not.toHaveBeenCalled();
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    expect(mockHandleImageEditMessage).not.toHaveBeenCalled();
    unmount();
  });

  it('blocks oversized text files when server-side code execution is enabled', async () => {
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: false,
    });

    const setAppFileError = vi.fn();

    const { result, unmount } = renderMessageSender({
      appSettings: {
        isCodeExecutionEnabled: true,
        isLocalPythonEnabled: false,
      },
      currentChatSettings: {
        modelId: 'gemini-3-flash-preview',
        isCodeExecutionEnabled: true,
        isLocalPythonEnabled: false,
      },
      selectedFiles: [
        createUploadedFile({
          name: 'large.csv',
          type: 'text/csv',
          size: 2 * 1024 * 1024 + 1,
        }),
      ],
      setAppFileError,
    });

    await act(async () => {
      await result.current.handleSendMessage({ text: 'analyze this file' });
    });

    expect(setAppFileError).toHaveBeenCalledWith('代码执行文本/CSV 文件建议不超过 2MB。请拆分文件或关闭代码执行。');
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    unmount();
  });

  it('blocks manual sends while failed attachments are still selected', async () => {
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: false,
    });

    const setAppFileError = vi.fn();

    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: 'gemini-3-flash-preview',
      },
      selectedFiles: [
        createUploadedFile({
          name: 'failed.pdf',
          type: 'application/pdf',
          uploadState: 'failed',
          error: 'Backend processing failed.',
        }),
      ],
      setAppFileError,
    });

    await act(async () => {
      await result.current.handleSendMessage({ text: 'summarize this' });
    });

    expect(setAppFileError).toHaveBeenCalledWith('附件上传失败。请移除失败文件或重新上传后再发送。');
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
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

    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: 'gemini-3-pro-image-preview',
      },
      selectedFiles: [
        createUploadedFile({
          name: 'reference.pdf',
          type: 'application/pdf',
        }),
      ],
      setAppFileError,
    });

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

    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: 'gemini-3.1-flash-image-preview',
      },
      selectedFiles: [
        createUploadedFile({
          name: 'reference.pdf',
          type: 'application/pdf',
        }),
      ],
      setAppFileError,
    });

    await act(async () => {
      await result.current.handleSendMessage({
        text: 'turn this into a cover',
      });
    });

    expect(setAppFileError).toHaveBeenCalledWith(null);
    expect(mockSendStandardMessage).toHaveBeenCalled();
    unmount();
  });

  it('uses the independent OpenAI-compatible model before applying Gemini model routing', async () => {
    mockGetModelCapabilities.mockImplementation((modelId: string) => ({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: modelId === 'gemini-3-pro-image-preview',
    }));

    const setAppFileError = vi.fn();
    const selectedFiles = [
      createUploadedFile({
        name: 'reference.pdf',
        type: 'application/pdf',
      }),
    ];

    const { result, unmount } = renderMessageSender({
      appSettings: {
        apiMode: 'openai-compatible',
        openaiCompatibleModelId: 'gpt-5.5',
      },
      currentChatSettings: {
        modelId: 'gemini-3-pro-image-preview',
      },
      selectedFiles,
      setAppFileError,
    });

    await act(async () => {
      await result.current.handleSendMessage({ text: 'summarize this PDF' });
    });

    expect(mockGetModelCapabilities).toHaveBeenCalledWith('gpt-5.5');
    expect(setAppFileError).toHaveBeenCalledWith(null);
    expect(mockHandleImageEditMessage).not.toHaveBeenCalled();
    expect(mockSendStandardMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'summarize this PDF',
        files: selectedFiles,
        editingMessageId: null,
        activeModelId: 'gpt-5.5',
        isContinueMode: false,
        isFastMode: false,
        request: expect.objectContaining({
          ok: true,
          keyToUse: 'api-key',
          generationId: 'generation-id',
          abortController: expect.any(AbortController),
        }),
      }),
    );
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

    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: '',
      },
      setActiveSessionId,
      updateAndPersistSessions,
    });

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
