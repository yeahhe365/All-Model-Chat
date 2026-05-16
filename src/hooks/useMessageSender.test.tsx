import { act } from 'react';
import { renderHookWithProviders } from '@/test/providerTestUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSendStandardMessage,
  mockSendTtsImagenMessage,
  mockSendImageEditMessage,
  mockGetModelCapabilities,
  mockCreateMessage,
  mockCreateNewSession,
  mockSenderStoreActions,
  mockGetFileMetadataApi,
  mockUploadFileApi,
} = vi.hoisted(() => ({
  mockSendStandardMessage: vi.fn(),
  mockSendTtsImagenMessage: vi.fn(),
  mockSendImageEditMessage: vi.fn(),
  mockGetModelCapabilities: vi.fn(),
  mockCreateMessage: vi.fn((role: string, content: string, options?: Record<string, unknown>) => ({
    id: 'error-message-id',
    role,
    content,
    timestamp: new Date('2026-05-04T09:30:00.000Z'),
    ...options,
  })),
  mockCreateNewSession: vi.fn(),
  mockSenderStoreActions: {
    updateAndPersistSessions: vi.fn((updater) => updater([])),
    setActiveSessionId: vi.fn(),
    setSessionLoading: vi.fn(),
    activeJobs: { current: new Map() },
  },
  mockGetFileMetadataApi: vi.fn(),
  mockUploadFileApi: vi.fn(),
}));

vi.mock('@/features/message-sender/useChatStreamHandler', () => ({
  useChatStreamHandler: () => ({
    getStreamHandlers: vi.fn(),
  }),
}));

vi.mock('@/features/message-sender/standardChatStrategy', () => ({
  sendStandardMessage: mockSendStandardMessage,
}));

vi.mock('@/features/message-sender/ttsImagenStrategy', () => ({
  sendTtsImagenMessage: mockSendTtsImagenMessage,
}));

vi.mock('@/features/message-sender/imageEditStrategy', () => ({
  sendImageEditMessage: mockSendImageEditMessage,
}));

vi.mock('@/features/message-sender/senderStoreActions', () => ({
  createSenderStoreActions: () => mockSenderStoreActions,
}));

vi.mock('@/utils/modelHelpers', () => ({
  getModelCapabilities: mockGetModelCapabilities,
}));

vi.mock('@/utils/chat/ids', () => ({
  generateUniqueId: vi.fn(() => 'generation-id'),
}));

vi.mock('@/utils/apiUtils', () => ({
  getKeyForRequest: vi.fn(() => ({ key: 'api-key', isNewKey: false })),
  getApiKeyErrorTranslationKey: vi.fn((error: string) => {
    if (error === 'API Key not configured.') return 'apiRuntime_keyNotConfigured';
    if (error === 'No valid API keys found.') return 'apiRuntime_noValidKeysFound';
    return null;
  }),
}));

vi.mock('@/utils/chat/session', () => ({
  createMessage: mockCreateMessage,
  createNewSession: mockCreateNewSession,
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

vi.mock('@/services/api/fileApi', () => ({
  getFileMetadataApi: mockGetFileMetadataApi,
  uploadFileApi: mockUploadFileApi,
}));

import { useMessageSender } from './useMessageSender';
import { createMessageSenderProps, type MessageSenderPropsOverrides } from '@/test/hookFactories';
import { createChatSettings, createUploadedFile } from '@/test/factories';

describe('useMessageSender', () => {
  const renderMessageSender = (overrides: MessageSenderPropsOverrides = {}) =>
    renderHookWithProviders(() => useMessageSender(createMessageSenderProps({ language: 'zh', ...overrides })), {
      language: 'zh',
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNewSession.mockReturnValue({ id: 'new-session' });
    mockSenderStoreActions.updateAndPersistSessions.mockImplementation((updater) => updater([]));
    mockGetFileMetadataApi.mockResolvedValue({ state: 'ACTIVE', name: 'files/current', uri: 'https://files/current' });
    mockUploadFileApi.mockResolvedValue({ state: 'ACTIVE', name: 'files/refreshed', uri: 'https://files/refreshed' });
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
    expect(mockSendTtsImagenMessage).not.toHaveBeenCalled();
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    expect(mockSendImageEditMessage).not.toHaveBeenCalled();
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
    expect(mockSendTtsImagenMessage).not.toHaveBeenCalled();
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    expect(mockSendImageEditMessage).not.toHaveBeenCalled();
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
    expect(mockSendImageEditMessage).not.toHaveBeenCalled();
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

  it('passes per-send settings overrides into the standard message route', async () => {
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: false,
    });

    const settingsOverride = createChatSettings({
      modelId: 'gemini-3-flash-preview',
      systemInstruction: '[Live Artifacts Protocol - zh]\nLive prompt',
    });

    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: 'gemini-3-flash-preview',
        systemInstruction: '',
      },
    });

    await act(async () => {
      await result.current.handleSendMessage({
        text: 'Create interactive HTML board.',
        settingsOverride,
      });
    });

    expect(mockSendStandardMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          currentChatSettings: expect.objectContaining({
            systemInstruction: '[Live Artifacts Protocol - zh]\nLive prompt',
          }),
        }),
      }),
    );
    unmount();
  });

  it('converts local Files API references to inline files before sending in OpenAI-compatible mode', async () => {
    mockGetModelCapabilities.mockImplementation((modelId: string) => ({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: modelId === 'gemini-3-pro-image-preview',
    }));

    const setAppFileError = vi.fn();
    const rawFile = new File(['image-bytes'], 'reference.png', { type: 'image/png' });
    const selectedFiles = [
      createUploadedFile({
        name: 'reference.png',
        type: 'image/png',
        size: rawFile.size,
        rawFile,
        fileApiName: 'files/gemini-reference',
        fileUri: 'https://files/gemini-reference',
        transferStrategy: 'files-api',
      }),
    ];

    const { result, unmount } = renderMessageSender({
      appSettings: {
        isOpenAICompatibleApiEnabled: true,
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
      await result.current.handleSendMessage({ text: 'summarize this image' });
    });

    expect(mockGetModelCapabilities).toHaveBeenCalledWith('gpt-5.5');
    expect(mockGetFileMetadataApi).not.toHaveBeenCalled();
    expect(setAppFileError).toHaveBeenCalledWith(null);
    expect(mockSendImageEditMessage).not.toHaveBeenCalled();
    expect(mockSendStandardMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'summarize this image',
        files: [
          expect.objectContaining({
            name: 'reference.png',
            rawFile,
            fileApiName: undefined,
            fileUri: undefined,
            transferStrategy: 'inline',
          }),
        ],
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

  it('blocks remote-only Files API references in OpenAI-compatible mode', async () => {
    mockGetModelCapabilities.mockImplementation((modelId: string) => ({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: modelId === 'gemini-3-pro-image-preview',
    }));

    const setAppFileError = vi.fn();
    const selectedFiles = [
      createUploadedFile({
        name: 'remote-reference.png',
        type: 'image/png',
        rawFile: undefined,
        fileApiName: 'files/remote-reference',
        fileUri: 'https://files/remote-reference',
        transferStrategy: 'remote-file-id',
      }),
    ];

    const { result, unmount } = renderMessageSender({
      appSettings: {
        isOpenAICompatibleApiEnabled: true,
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
      await result.current.handleSendMessage({ text: 'describe this image' });
    });

    expect(mockGetModelCapabilities).toHaveBeenCalledWith('gpt-5.5');
    expect(mockGetFileMetadataApi).not.toHaveBeenCalled();
    expect(setAppFileError).toHaveBeenCalledWith(
      'OpenAI 兼容模式不能发送 Gemini Files API 远端引用。请重新附加 remote-reference.png 作为本地图片、音频或文本文件，或切回 Gemini API。',
    );
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    unmount();
  });

  it('creates a localized error session when no model is selected', async () => {
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
    expect(mockSenderStoreActions.setActiveSessionId).toHaveBeenCalledWith('new-session');
    unmount();
  });

  it('refreshes an expired Files API reference from the local file before sending', async () => {
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: false,
    });
    mockGetFileMetadataApi.mockResolvedValue(null);

    const rawFile = new File(['image-bytes'], 'reference.png', { type: 'image/png' });
    const staleFile = createUploadedFile({
      id: 'file-stale',
      name: 'reference.png',
      type: 'image/png',
      size: rawFile.size,
      rawFile,
      fileApiName: 'files/expired',
      fileUri: 'https://files/expired',
      uploadState: 'active',
      isProcessing: false,
    });
    const setSelectedFiles = vi.fn();

    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: 'gemini-3.1-pro-preview',
      },
      selectedFiles: [staleFile],
      setSelectedFiles,
    });

    await act(async () => {
      await result.current.handleSendMessage({ text: 'describe this image' });
    });

    expect(mockGetFileMetadataApi).toHaveBeenCalledWith('api-key', 'files/expired');
    expect(mockUploadFileApi).toHaveBeenCalledWith(
      'api-key',
      rawFile,
      'image/png',
      'reference.png',
      expect.any(AbortSignal),
    );
    expect(mockSendStandardMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [
          expect.objectContaining({
            id: 'file-stale',
            fileApiName: 'files/refreshed',
            fileUri: 'https://files/refreshed',
            uploadState: 'active',
            isProcessing: false,
          }),
        ],
      }),
    );
    expect(setSelectedFiles).toHaveBeenCalledWith(expect.any(Function));
    unmount();
  });

  it('blocks an expired Files API reference when no local backup is available', async () => {
    mockGetModelCapabilities.mockReturnValue({
      isTtsModel: false,
      isRealImagenModel: false,
      isFlashImageModel: false,
      isGemini3ImageModel: false,
    });
    mockGetFileMetadataApi.mockResolvedValue(null);

    const setAppFileError = vi.fn();
    const { result, unmount } = renderMessageSender({
      currentChatSettings: {
        modelId: 'gemini-3.1-pro-preview',
      },
      selectedFiles: [
        createUploadedFile({
          id: 'file-remote-only',
          name: 'remote-only.pdf',
          type: 'application/pdf',
          fileApiName: 'files/expired',
          fileUri: 'https://files/expired',
          uploadState: 'active',
          isProcessing: false,
          rawFile: undefined,
        }),
      ],
      setAppFileError,
    });

    await act(async () => {
      await result.current.handleSendMessage({ text: 'summarize this PDF' });
    });

    expect(mockUploadFileApi).not.toHaveBeenCalled();
    expect(setAppFileError).toHaveBeenCalledWith(
      'remote-only.pdf 的远端文件引用已失效，且本地备份不可用。请重新附加该文件。',
    );
    expect(mockSendStandardMessage).not.toHaveBeenCalled();
    unmount();
  });
});
