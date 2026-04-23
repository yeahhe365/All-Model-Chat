import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStandardChat } from './useStandardChat';

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
}));

vi.mock('../../services/logService', () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/apiUtils', () => ({
  getKeyForRequest: mockGetKeyForRequest,
}));

vi.mock('../../utils/chat/builder', () => ({
  buildContentParts: mockBuildContentParts,
  createChatHistoryForApi: mockCreateChatHistoryForApi,
}));

vi.mock('../../utils/chat/ids', () => ({
  generateUniqueId: vi.fn(() => 'generated-id'),
}));

vi.mock('../../utils/chat/session', () => ({
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

vi.mock('../../utils/modelHelpers', () => ({
  isGemini3Model: vi.fn((id: string) => id.includes('gemini-3')),
  isImageModel: vi.fn((id: string) => id.includes('image')),
  shouldStripThinkingFromContext: vi.fn(() => false),
}));

vi.mock('../../constants/appConstants', () => ({
  DEFAULT_CHAT_SETTINGS: {},
  MODELS_SUPPORTING_RAW_MODE: [],
}));

vi.mock('../../services/api/baseApi', () => ({
  buildGenerationConfig: mockBuildGenerationConfig,
  appendFunctionDeclarationsToTools: mockAppendFunctionDeclarationsToTools,
}));

vi.mock('../../services/api/chatApi', () => ({
  generateContentTurnApi: vi.fn(),
}));

vi.mock('../../services/geminiService', () => ({
  geminiServiceInstance: {
    sendMessageStream: mockSendMessageStream,
    sendMessageNonStream: mockSendMessageNonStream,
  },
}));

vi.mock('../../utils/codeUtils', () => ({
  isLikelyHtml: vi.fn(() => false),
}));

vi.mock('../../features/standard-chat/standardClientFunctions', () => ({
  createStandardClientFunctions: mockCreateStandardClientFunctions,
}));

vi.mock('../../features/standard-chat/standardToolLoop', () => ({
  runStandardToolLoop: mockRunStandardToolLoop,
}));

vi.mock('../../features/local-python/helpers', () => ({
  collectLocalPythonInputFiles: vi.fn(() => []),
}));

vi.mock('../../services/loadPyodideService', () => ({
  getPyodideService: vi.fn(),
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

describe('useStandardChat', () => {
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
  });

  it('passes the local-python flag into generation config when the client tool is enabled', async () => {
    const getStreamHandlers = vi.fn(() => ({
      streamOnError: vi.fn(),
      streamOnComplete: vi.fn(),
      streamOnPart: vi.fn(),
      onThoughtChunk: vi.fn(),
    }));

    const { result, unmount } = renderHook(() =>
      useStandardChat({
        appSettings: {
          hideThinkingInContext: false,
          isRawModeEnabled: false,
          autoCanvasVisualization: false,
          isStreamingEnabled: true,
        } as any,
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
          isLocalPythonEnabled: true,
          isUrlContextEnabled: false,
          isDeepSearchEnabled: false,
          safetySettings: [],
          mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
          hideThinkingInContext: false,
          lockedApiKey: null,
        } as any,
        messages: [],
        setEditingMessageId: vi.fn(),
        aspectRatio: '1:1',
        imageSize: '1K',
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
        userScrolledUpRef: { current: false },
        activeSessionId: 'session-1',
        setActiveSessionId: vi.fn(),
        activeJobs: { current: new Map() },
        setSessionLoading: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        getStreamHandlers,
        sessionKeyMapRef: { current: new Map() },
        handleGenerateCanvas: vi.fn(),
        setAppFileError: vi.fn(),
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.sendStandardMessage(
        'analyze the csv',
        [],
        null,
        'gemini-3-flash-preview',
      );
    });

    expect(mockBuildGenerationConfig).toHaveBeenCalledWith(
      'gemini-3-flash-preview',
      'Custom system instruction',
      expect.any(Object),
      true,
      0,
      false,
      false,
      false,
      'LOW',
      '1:1',
      false,
      '1K',
      [],
      'MEDIA_RESOLUTION_UNSPECIFIED',
      true,
      'IMAGE_TEXT',
      'ALLOW_ADULT',
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

    const { result, unmount } = renderHook(() =>
      useStandardChat({
        appSettings: {
          hideThinkingInContext: false,
          isRawModeEnabled: false,
          autoCanvasVisualization: false,
          isStreamingEnabled: true,
        } as any,
        currentChatSettings: {
          modelId: 'gemini-3-pro-image-preview',
          systemInstruction: 'Custom system instruction',
          temperature: 1,
          topP: 0.95,
          topK: 64,
          showThoughts: true,
          thinkingBudget: 0,
          thinkingLevel: 'LOW',
          isGoogleSearchEnabled: false,
          isCodeExecutionEnabled: false,
          isLocalPythonEnabled: true,
          isUrlContextEnabled: false,
          isDeepSearchEnabled: false,
          safetySettings: [],
          mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
          hideThinkingInContext: false,
          lockedApiKey: null,
        } as any,
        messages: [],
        setEditingMessageId: vi.fn(),
        aspectRatio: '1:1',
        imageSize: '1K',
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
        userScrolledUpRef: { current: false },
        activeSessionId: 'session-1',
        setActiveSessionId: vi.fn(),
        activeJobs: { current: new Map() },
        setSessionLoading: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        getStreamHandlers,
        sessionKeyMapRef: { current: new Map() },
        handleGenerateCanvas: vi.fn(),
        setAppFileError: vi.fn(),
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.sendStandardMessage(
        'make it cinematic',
        [],
        null,
        'gemini-3-pro-image-preview',
      );
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

    const { result, unmount } = renderHook(() =>
      useStandardChat({
        appSettings: {
          hideThinkingInContext: false,
          isRawModeEnabled: false,
          autoCanvasVisualization: false,
          isStreamingEnabled: true,
        } as any,
        currentChatSettings: {
          modelId: 'gemini-2.5-flash',
          systemInstruction: 'Custom system instruction',
          temperature: 1,
          topP: 0.95,
          topK: 64,
          showThoughts: true,
          thinkingBudget: 0,
          thinkingLevel: 'LOW',
          isGoogleSearchEnabled: true,
          isCodeExecutionEnabled: false,
          isLocalPythonEnabled: true,
          isUrlContextEnabled: false,
          isDeepSearchEnabled: false,
          safetySettings: [],
          mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
          hideThinkingInContext: false,
          lockedApiKey: null,
        } as any,
        messages: [],
        setEditingMessageId: vi.fn(),
        aspectRatio: '1:1',
        imageSize: '1K',
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
        userScrolledUpRef: { current: false },
        activeSessionId: 'session-1',
        setActiveSessionId: vi.fn(),
        activeJobs: { current: new Map() },
        setSessionLoading: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        getStreamHandlers,
        sessionKeyMapRef: { current: new Map() },
        handleGenerateCanvas: vi.fn(),
        setAppFileError: vi.fn(),
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.sendStandardMessage(
        'analyze the csv',
        [],
        null,
        'gemini-2.5-flash',
      );
    });

    expect(mockBuildGenerationConfig).toHaveBeenCalledWith(
      'gemini-2.5-flash',
      'Custom system instruction',
      expect.any(Object),
      true,
      0,
      true,
      false,
      false,
      'LOW',
      '1:1',
      false,
      '1K',
      [],
      'MEDIA_RESOLUTION_UNSPECIFIED',
      false,
      'IMAGE_TEXT',
      'ALLOW_ADULT',
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
      async (
        _apiKey,
        _modelId,
        _history,
        _parts,
        _config,
        _signal,
        _onError,
        onComplete,
      ) => {
        onComplete(
          [{ text: 'done' }],
          undefined,
          { totalTokenCount: 7 },
          { citations: [{ uri: 'https://example.com/grounding' }] },
          { visitedUrls: ['https://example.com/article'] },
        );
      },
    );

    const { result, unmount } = renderHook(() =>
      useStandardChat({
        appSettings: {
          hideThinkingInContext: false,
          isRawModeEnabled: false,
          autoCanvasVisualization: false,
          isStreamingEnabled: false,
        } as any,
        currentChatSettings: {
          modelId: 'gemini-2.5-flash',
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
          isUrlContextEnabled: true,
          isDeepSearchEnabled: false,
          safetySettings: [],
          mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
          hideThinkingInContext: false,
          lockedApiKey: null,
        } as any,
        messages: [],
        setEditingMessageId: vi.fn(),
        aspectRatio: '1:1',
        imageSize: '1K',
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
        userScrolledUpRef: { current: false },
        activeSessionId: 'session-1',
        setActiveSessionId: vi.fn(),
        activeJobs: { current: new Map() },
        setSessionLoading: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        getStreamHandlers,
        sessionKeyMapRef: { current: new Map() },
        handleGenerateCanvas: vi.fn(),
        setAppFileError: vi.fn(),
        language: 'en',
      }),
    );

    await act(async () => {
      await result.current.sendStandardMessage(
        'summarize this url',
        [],
        null,
        'gemini-2.5-flash',
      );
    });

    expect(streamOnComplete).toHaveBeenCalledWith(
      { totalTokenCount: 7 },
      { citations: [{ uri: 'https://example.com/grounding' }] },
      { visitedUrls: ['https://example.com/article'] },
    );

    unmount();
  });
});
