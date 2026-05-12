import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendStandardMessage } from './standardChatStrategy';
import { createStandardChatProps, type StandardChatPropsOverrides } from '@/test/hookFactories';
import { MediaResolution } from '@/types';
import type { PreparedModelRequest } from './useModelRequestRunner';

const {
  mockBuildContentParts,
  mockCreateChatHistoryForApi,
  mockGetKeyForRequest,
  mockBuildGenerationConfig,
  mockAppendFunctionDeclarationsToTools,
  mockRunStandardToolLoop,
  mockCreateStandardClientFunctions,
  mockSendMessageStream,
  mockSendMessageNonStream,
  mockSendOpenAICompatibleMessageStream,
  mockSendOpenAICompatibleMessageNonStream,
  mockModelCapabilities,
} = vi.hoisted(() => ({
  mockBuildContentParts: vi.fn(),
  mockCreateChatHistoryForApi: vi.fn(),
  mockGetKeyForRequest: vi.fn(),
  mockBuildGenerationConfig: vi.fn(),
  mockAppendFunctionDeclarationsToTools: vi.fn(),
  mockRunStandardToolLoop: vi.fn(),
  mockCreateStandardClientFunctions: vi.fn(),
  mockSendMessageStream: vi.fn(),
  mockSendMessageNonStream: vi.fn(),
  mockSendOpenAICompatibleMessageStream: vi.fn(),
  mockSendOpenAICompatibleMessageNonStream: vi.fn(),
  mockModelCapabilities: vi.fn((id: string) => ({
    isGemini3: id.includes('gemini-3'),
    supportsRawReasoningPrefill: false,
  })),
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

vi.mock('@/utils/apiUtils', () => ({
  getKeyForRequest: mockGetKeyForRequest,
}));

vi.mock('@/utils/chat/builder', () => ({
  buildContentParts: mockBuildContentParts,
  createChatHistoryForApi: mockCreateChatHistoryForApi,
}));

vi.mock('@/utils/chat/ids', () => ({
  generateUniqueId: vi.fn(() => 'generated-id'),
}));

vi.mock('@/utils/chat/session', () => ({
  performOptimisticSessionUpdate: vi.fn((prev) => prev),
  generateSessionTitle: vi.fn(() => 'New Chat'),
  createMessage: vi.fn((role: string, content: string, options?: Record<string, unknown>) => ({
    id: options?.id ?? `${role}-message`,
    role,
    content,
    ...options,
    timestamp: new Date(),
  })),
}));

vi.mock('@/utils/modelHelpers', () => ({
  isGemini3Model: vi.fn((id: string) => id.includes('gemini-3')),
  isImageModel: vi.fn((id: string) => id.includes('image')),
  shouldStripThinkingFromContext: vi.fn(() => false),
  getModelCapabilities: mockModelCapabilities,
}));

vi.mock('@/constants/appConstants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constants/appConstants')>();

  return {
    ...actual,
    DEFAULT_CHAT_SETTINGS: {},
  };
});

vi.mock('@/services/api/generationConfig', () => ({
  buildGenerationConfig: mockBuildGenerationConfig,
  appendFunctionDeclarationsToTools: mockAppendFunctionDeclarationsToTools,
}));

vi.mock('@/services/api/chatApi', () => ({
  generateContentTurnApi: vi.fn(),
  sendStatelessMessageStreamApi: mockSendMessageStream,
  sendStatelessMessageNonStreamApi: mockSendMessageNonStream,
}));

vi.mock('@/services/api/openaiCompatibleApi', () => ({
  sendOpenAICompatibleMessageStream: mockSendOpenAICompatibleMessageStream,
  sendOpenAICompatibleMessageNonStream: mockSendOpenAICompatibleMessageNonStream,
}));

vi.mock('@/utils/codeUtils', () => ({
  isLikelyHtml: vi.fn(() => false),
}));

vi.mock('@/features/standard-chat/standardClientFunctions', () => ({
  createStandardClientFunctions: mockCreateStandardClientFunctions,
}));

vi.mock('@/features/standard-chat/standardToolLoop', () => ({
  runStandardToolLoop: mockRunStandardToolLoop,
}));

vi.mock('@/features/local-python/helpers', () => ({
  collectLocalPythonInputFiles: vi.fn(() => []),
}));

vi.mock('@/features/local-python/loadPyodideService', () => ({
  getPyodideService: vi.fn(),
}));

describe('standardChatStrategy', () => {
  const createBaseStandardChatOverrides = (overrides: StandardChatPropsOverrides = {}): StandardChatPropsOverrides => ({
    ...overrides,
    appSettings: {
      hideThinkingInContext: false,
      isRawModeEnabled: false,
      autoLiveArtifactsVisualization: false,
      isStreamingEnabled: true,
      ...overrides.appSettings,
    },
    currentChatSettings: {
      modelId: 'gemini-3-flash-preview',
      systemInstruction: 'Custom system instruction',
      temperature: 1,
      topP: 0.95,
      topK: 64,
      showThoughts: true,
      thinkingBudget: 0,
      thinkingLevel: 'LOW',
      isGoogleSearchEnabled: false,
      isCodeExecutionEnabled: false,
      isLocalPythonEnabled: false,
      isUrlContextEnabled: false,
      isDeepSearchEnabled: false,
      safetySettings: [],
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
      hideThinkingInContext: false,
      lockedApiKey: null,
      ...overrides.currentChatSettings,
    },
  });

  const renderStandardChat = (overrides: StandardChatPropsOverrides = {}) => {
    const props = createStandardChatProps(createBaseStandardChatOverrides(overrides));
    const runMessageLifecycle = vi.fn(async ({ execute }) => execute());

    return {
      result: {
        current: {
          sendStandardMessage: (
            input: Omit<
              Parameters<typeof sendStandardMessage>[0],
              'props' | 'getStreamHandlers' | 'handleGenerateLiveArtifacts' | 'runMessageLifecycle'
            >,
          ) =>
            sendStandardMessage({
              props,
              getStreamHandlers: props.getStreamHandlers,
              handleGenerateLiveArtifacts: props.handleGenerateLiveArtifacts,
              runMessageLifecycle,
              ...input,
            }),
        },
      },
      unmount: () => undefined,
      runMessageLifecycle,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetKeyForRequest.mockReturnValue({ key: 'api-key', isNewKey: false });
    mockBuildContentParts.mockResolvedValue({
      contentParts: [{ text: 'analyze the csv' }],
      enrichedFiles: [],
    });
    mockCreateChatHistoryForApi.mockResolvedValue([]);
    mockBuildGenerationConfig.mockResolvedValue({ systemInstruction: 'base config' });
    mockAppendFunctionDeclarationsToTools.mockImplementation((_modelId, config) => config);
    mockCreateStandardClientFunctions.mockImplementation(({ isLocalPythonEnabled }) =>
      isLocalPythonEnabled
        ? {
            run_local_python: {
              declaration: {
                name: 'run_local_python',
                description: 'Run Python locally.',
              },
              handler: vi.fn(),
            },
          }
        : {},
    );
    mockRunStandardToolLoop.mockResolvedValue({
      finalTurn: {
        parts: [{ text: 'done' }],
        thoughts: undefined,
        usage: undefined,
        grounding: undefined,
        urlContext: undefined,
      },
      toolMessages: [],
      generatedFiles: [],
    });
    mockSendMessageStream.mockResolvedValue(undefined);
    mockSendMessageNonStream.mockResolvedValue(undefined);
    mockSendOpenAICompatibleMessageStream.mockResolvedValue(undefined);
    mockSendOpenAICompatibleMessageNonStream.mockResolvedValue(undefined);
    mockModelCapabilities.mockImplementation((id: string) => ({
      isGemini3: id.includes('gemini-3'),
      supportsRawReasoningPrefill: false,
    }));
  });

  const createPreparedRequest = (overrides: Partial<PreparedModelRequest> = {}): PreparedModelRequest => ({
    ok: true,
    keyToUse: 'api-key',
    isNewKey: false,
    shouldLockKey: false,
    generationId: 'prepared-generation-id',
    generationStartTime: new Date('2026-05-04T09:00:00.000Z'),
    abortController: new AbortController(),
    ...overrides,
  });

  it('uses a prepared request context without looking up the API key again', async () => {
    const getStreamHandlers = vi.fn(() => ({
      streamOnError: vi.fn(),
      streamOnComplete: vi.fn(),
      streamOnPart: vi.fn(),
      onThoughtChunk: vi.fn(),
    }));

    const { result, unmount } = renderStandardChat({ getStreamHandlers });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'analyze the csv',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-flash-preview',
        request: createPreparedRequest({ keyToUse: 'prepared-key' }),
      });
    });

    expect(mockGetKeyForRequest).not.toHaveBeenCalled();
    expect(mockSendMessageStream).toHaveBeenCalledWith(
      'prepared-key',
      'gemini-3-flash-preview',
      [],
      [{ text: 'analyze the csv' }],
      expect.any(Object),
      expect.any(AbortSignal),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      'user',
    );

    unmount();
  });

  it('passes the local-python flag into generation config when the client tool is enabled', async () => {
    const getStreamHandlers = vi.fn(() => ({
      streamOnError: vi.fn(),
      streamOnComplete: vi.fn(),
      streamOnPart: vi.fn(),
      onThoughtChunk: vi.fn(),
    }));

    const { result, unmount } = renderStandardChat({
      currentChatSettings: {
        isLocalPythonEnabled: true,
      },
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'analyze the csv',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-flash-preview',
        request: createPreparedRequest(),
      });
    });

    expect(mockBuildGenerationConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gemini-3-flash-preview',
        settings: expect.objectContaining({
          modelId: 'gemini-3-flash-preview',
          systemInstruction: 'Custom system instruction',
          showThoughts: true,
          thinkingBudget: 0,
          isGoogleSearchEnabled: false,
          isCodeExecutionEnabled: false,
          isUrlContextEnabled: false,
          thinkingLevel: 'LOW',
          isDeepSearchEnabled: false,
          safetySettings: [],
          mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
          isLocalPythonEnabled: true,
        }),
        aspectRatio: '1:1',
        imageSize: '1K',
        isLocalPythonEnabled: true,
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
      }),
    );

    unmount();
  });

  it('routes standard chat through OpenAI-compatible streaming when the global mode is selected', async () => {
    const streamOnError = vi.fn();
    const streamOnComplete = vi.fn();
    const streamOnPart = vi.fn();
    const onThoughtChunk = vi.fn();
    const getStreamHandlers = vi.fn(() => ({
      streamOnError,
      streamOnComplete,
      streamOnPart,
      onThoughtChunk,
    }));

    const { result, unmount } = renderStandardChat({
      appSettings: {
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
        apiKey: 'gemini-key',
        openaiCompatibleApiKey: 'openai-key',
        openaiCompatibleBaseUrl: 'https://api.openai.com/v1',
        openaiCompatibleModelId: 'gpt-5.5',
      },
      currentChatSettings: {
        isGoogleSearchEnabled: true,
        isCodeExecutionEnabled: true,
        isLocalPythonEnabled: true,
        isUrlContextEnabled: true,
        isDeepSearchEnabled: true,
      },
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'hello through compat',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-flash-preview',
        request: createPreparedRequest(),
      });
    });

    expect(mockBuildGenerationConfig).not.toHaveBeenCalled();
    expect(mockCreateStandardClientFunctions).not.toHaveBeenCalled();
    expect(mockSendMessageStream).not.toHaveBeenCalled();
    expect(mockSendOpenAICompatibleMessageStream).toHaveBeenCalledWith(
      'api-key',
      'gpt-5.5',
      [],
      [{ text: 'analyze the csv' }],
      {
        baseUrl: 'https://api.openai.com/v1',
        systemInstruction: 'Custom system instruction',
        temperature: 1,
        topP: 0.95,
      },
      expect.any(AbortSignal),
      streamOnPart,
      onThoughtChunk,
      streamOnError,
      streamOnComplete,
      'user',
    );

    unmount();
  });

  it('routes non-stream OpenAI-compatible chat with the independent OpenAI model id', async () => {
    const streamOnError = vi.fn();
    const streamOnComplete = vi.fn();
    const streamOnPart = vi.fn();
    const onThoughtChunk = vi.fn();
    const getStreamHandlers = vi.fn(() => ({
      streamOnError,
      streamOnComplete,
      streamOnPart,
      onThoughtChunk,
    }));

    const { result, unmount } = renderStandardChat({
      appSettings: {
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
        apiKey: 'gemini-key',
        openaiCompatibleApiKey: 'openai-key',
        openaiCompatibleBaseUrl: 'https://api.openai.com/v1',
        openaiCompatibleModelId: 'gpt-4.1-custom',
        isStreamingEnabled: false,
      },
      currentChatSettings: {
        isGoogleSearchEnabled: true,
        isCodeExecutionEnabled: true,
        isLocalPythonEnabled: true,
        isUrlContextEnabled: true,
        isDeepSearchEnabled: true,
      },
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'hello through compat',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-flash-preview',
        request: createPreparedRequest(),
      });
    });

    expect(mockBuildGenerationConfig).not.toHaveBeenCalled();
    expect(mockSendMessageNonStream).not.toHaveBeenCalled();
    expect(mockSendOpenAICompatibleMessageNonStream).toHaveBeenCalledWith(
      'api-key',
      'gpt-4.1-custom',
      [],
      [{ text: 'analyze the csv' }],
      {
        baseUrl: 'https://api.openai.com/v1',
        systemInstruction: 'Custom system instruction',
        temperature: 1,
        topP: 0.95,
      },
      expect.any(AbortSignal),
      streamOnError,
      expect.any(Function),
      'user',
    );

    unmount();
  });

  it('uses Gemini chat routing when OpenAI-compatible mode is stored but the provider switch is off', async () => {
    const { result, unmount } = renderStandardChat({
      appSettings: {
        isOpenAICompatibleApiEnabled: false,
        apiMode: 'openai-compatible',
        apiKey: 'gemini-key',
        openaiCompatibleApiKey: 'openai-key',
        openaiCompatibleModelId: 'gpt-5.5',
      },
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'hello through gemini',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-flash-preview',
        request: createPreparedRequest(),
      });
    });

    expect(mockSendOpenAICompatibleMessageStream).not.toHaveBeenCalled();
    expect(mockSendMessageStream).toHaveBeenCalled();
    expect(mockBuildGenerationConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gemini-3-flash-preview',
      }),
    );

    unmount();
  });

  it('does not expose local python tools on image-generation models', async () => {
    const getStreamHandlers = vi.fn(() => ({
      streamOnError: vi.fn(),
      streamOnComplete: vi.fn(),
      streamOnPart: vi.fn(),
      onThoughtChunk: vi.fn(),
    }));

    const { result, unmount } = renderStandardChat({
      currentChatSettings: {
        modelId: 'gemini-3-pro-image-preview',
        isLocalPythonEnabled: true,
      },
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'make it cinematic',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-pro-image-preview',
        request: createPreparedRequest(),
      });
    });

    expect(mockCreateStandardClientFunctions).toHaveBeenCalledWith(
      expect.objectContaining({
        isLocalPythonEnabled: false,
      }),
    );
    expect(mockAppendFunctionDeclarationsToTools).toHaveBeenCalledWith(
      'gemini-3-pro-image-preview',
      expect.any(Object),
      [],
    );

    unmount();
  });

  it('falls back to the normal send path when custom declarations were stripped from the final request', async () => {
    const streamOnError = vi.fn();
    const streamOnComplete = vi.fn();
    const streamOnPart = vi.fn();
    const onThoughtChunk = vi.fn();
    const getStreamHandlers = vi.fn(() => ({
      streamOnError,
      streamOnComplete,
      streamOnPart,
      onThoughtChunk,
    }));

    mockBuildGenerationConfig.mockResolvedValue({
      systemInstruction: 'base config',
      tools: [{ googleSearch: {} }],
    });
    mockAppendFunctionDeclarationsToTools.mockReturnValue({
      systemInstruction: 'base config',
      tools: [{ googleSearch: {} }],
    });

    const { result, unmount } = renderStandardChat({
      currentChatSettings: {
        modelId: 'gemini-2.5-flash',
        isGoogleSearchEnabled: true,
        isLocalPythonEnabled: true,
      },
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'analyze the csv',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-2.5-flash',
        request: createPreparedRequest(),
      });
    });

    expect(mockBuildGenerationConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gemini-2.5-flash',
        settings: expect.objectContaining({
          modelId: 'gemini-2.5-flash',
          systemInstruction: 'Custom system instruction',
          showThoughts: true,
          thinkingBudget: 0,
          isGoogleSearchEnabled: true,
          isCodeExecutionEnabled: false,
          isUrlContextEnabled: false,
          thinkingLevel: 'LOW',
          isDeepSearchEnabled: false,
          safetySettings: [],
          mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
          isLocalPythonEnabled: true,
        }),
        aspectRatio: '1:1',
        imageSize: '1K',
        isLocalPythonEnabled: false,
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
      }),
    );
    expect(mockRunStandardToolLoop).not.toHaveBeenCalled();
    expect(mockSendMessageStream).toHaveBeenCalledOnce();

    unmount();
  });

  it('forwards url context metadata to the completion handler on non-stream standard requests', async () => {
    const streamOnError = vi.fn();
    const streamOnComplete = vi.fn();
    const streamOnPart = vi.fn();
    const onThoughtChunk = vi.fn();
    const getStreamHandlers = vi.fn(() => ({
      streamOnError,
      streamOnComplete,
      streamOnPart,
      onThoughtChunk,
    }));

    mockCreateStandardClientFunctions.mockReturnValue({});
    mockSendMessageNonStream.mockImplementation(
      async (_apiKey, _modelId, _history, _parts, _config, _signal, _onError, onComplete) => {
        onComplete(
          [{ text: 'done' }],
          undefined,
          { totalTokenCount: 7 },
          { citations: [{ uri: 'https://example.com/grounding' }] },
          { visitedUrls: ['https://example.com/article'] },
        );
      },
    );

    const { result, unmount } = renderStandardChat({
      appSettings: {
        isStreamingEnabled: false,
      },
      currentChatSettings: {
        modelId: 'gemini-2.5-flash',
        isUrlContextEnabled: true,
      },
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'summarize this url',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-2.5-flash',
        request: createPreparedRequest(),
      });
    });

    expect(streamOnComplete).toHaveBeenCalledWith(
      { totalTokenCount: 7 },
      { citations: [{ uri: 'https://example.com/grounding' }] },
      { visitedUrls: ['https://example.com/article'] },
    );

    unmount();
  });

  it('sends raw reasoning non-stream turns as model-prefill continuations', async () => {
    const streamOnError = vi.fn();
    const streamOnComplete = vi.fn();
    const streamOnPart = vi.fn();
    const onThoughtChunk = vi.fn();
    const getStreamHandlers = vi.fn(() => ({
      streamOnError,
      streamOnComplete,
      streamOnPart,
      onThoughtChunk,
    }));

    mockModelCapabilities.mockImplementation((id: string) => ({
      isGemini3: id.includes('gemini-3'),
      supportsRawReasoningPrefill: id === 'gemini-3-flash-preview',
    }));
    mockCreateStandardClientFunctions.mockReturnValue({});
    mockSendMessageNonStream.mockImplementation(
      async (_apiKey, _modelId, _history, _parts, _config, _signal, _onError, onComplete) => {
        onComplete([{ text: 'raw answer' }]);
      },
    );

    const { result, unmount } = renderStandardChat({
      appSettings: {
        isRawModeEnabled: true,
        isStreamingEnabled: false,
      },
      currentChatSettings: {
        isRawModeEnabled: true,
      },
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'show raw reasoning',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-flash-preview',
        request: createPreparedRequest(),
      });
    });

    expect(mockCreateChatHistoryForApi).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: 'temp-raw-user',
          role: 'user',
          content: 'show raw reasoning',
        }),
      ],
      false,
      'gemini-3-flash-preview',
      false,
    );
    expect(mockSendMessageNonStream).toHaveBeenCalledWith(
      'api-key',
      'gemini-3-flash-preview',
      [],
      [{ text: '<thinking>' }],
      expect.any(Object),
      expect.any(AbortSignal),
      streamOnError,
      expect.any(Function),
      'model',
    );

    unmount();
  });

  it('keeps local python generated files on the final visible message when the tool loop completes', async () => {
    const streamOnError = vi.fn();
    const streamOnComplete = vi.fn();
    const streamOnPart = vi.fn();
    const onThoughtChunk = vi.fn();
    const updateAndPersistSessions = vi.fn();
    const generatedFile = {
      id: 'plot-file',
      name: 'generated-plot.png',
      type: 'image/png',
      size: 12,
      dataUrl: 'blob:plot',
      uploadState: 'active' as const,
    };
    const getStreamHandlers = vi.fn(() => ({
      streamOnError,
      streamOnComplete,
      streamOnPart,
      onThoughtChunk,
    }));

    mockBuildGenerationConfig.mockResolvedValue({ systemInstruction: 'base config' });
    mockAppendFunctionDeclarationsToTools.mockImplementation((_modelId, config, declarations) => ({
      ...config,
      tools: [{ functionDeclarations: declarations }],
    }));
    mockRunStandardToolLoop.mockResolvedValue({
      finalTurn: {
        parts: [{ text: '已生成图片。' }],
        thoughts: undefined,
        usage: undefined,
        grounding: undefined,
        urlContext: undefined,
      },
      toolMessages: [],
      generatedFiles: [generatedFile],
    });

    const { result, unmount } = renderStandardChat({
      currentChatSettings: {
        isLocalPythonEnabled: true,
      },
      updateAndPersistSessions,
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: '用 Python 画图',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-flash-preview',
        request: createPreparedRequest(),
      });
    });

    expect(streamOnComplete).toHaveBeenCalledWith(undefined, undefined, undefined, [generatedFile]);

    unmount();
  });

  it('routes thrown standard stream errors through the stream error handler', async () => {
    const streamOnError = vi.fn();
    const streamOnComplete = vi.fn();
    const streamOnPart = vi.fn();
    const onThoughtChunk = vi.fn();
    const thrownError = new Error('network broke');
    const getStreamHandlers = vi.fn(() => ({
      streamOnError,
      streamOnComplete,
      streamOnPart,
      onThoughtChunk,
    }));

    mockSendMessageStream.mockRejectedValue(thrownError);

    const { result, unmount } = renderStandardChat({
      getStreamHandlers,
    });

    await act(async () => {
      await result.current.sendStandardMessage({
        text: 'hello',
        files: [],
        editingMessageId: null,
        activeModelId: 'gemini-3-flash-preview',
        request: createPreparedRequest(),
      });
    });

    expect(streamOnError).toHaveBeenCalledWith(thrownError);
    expect(streamOnComplete).not.toHaveBeenCalled();

    unmount();
  });
});
