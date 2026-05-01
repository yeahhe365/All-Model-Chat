import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleApiErrorMock,
  editImageMock,
  buildContentPartsMock,
  createChatHistoryForApiMock,
  performOptimisticSessionUpdateMock,
  createUploadedFileFromBase64Mock,
} = vi.hoisted(() => ({
  handleApiErrorMock: vi.fn(),
  editImageMock: vi.fn(),
  buildContentPartsMock: vi.fn(),
  createChatHistoryForApiMock: vi.fn(),
  performOptimisticSessionUpdateMock: vi.fn((prev: unknown) => prev),
  createUploadedFileFromBase64Mock: vi.fn(() => ({
    id: 'file-1',
    name: 'edited-image-1.png',
    type: 'image/png',
    size: 123,
  })),
}));

vi.mock('./useApiErrorHandler', () => ({
  useApiErrorHandler: () => ({
    handleApiError: handleApiErrorMock,
  }),
}));

vi.mock('../../services/geminiService', () => ({
  geminiServiceInstance: {
    editImage: editImageMock,
  },
}));

vi.mock('../../utils/chat/builder', () => ({
  buildContentParts: buildContentPartsMock,
  createChatHistoryForApi: createChatHistoryForApiMock,
}));

vi.mock('../../services/logService', () => ({
  logService: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/chat/session', () => ({
  performOptimisticSessionUpdate: performOptimisticSessionUpdateMock,
  createMessage: (role: 'user' | 'model', content: string, options: Record<string, unknown> = {}) => ({
    id: options.id ?? `${role}-message`,
    role,
    content,
    timestamp: new Date('2026-04-21T00:00:00.000Z'),
    ...options,
  }),
  generateSessionTitle: vi.fn(() => 'Generated Title'),
}));

vi.mock('../../utils/chat/parsing', () => ({
  createUploadedFileFromBase64: createUploadedFileFromBase64Mock,
}));

vi.mock('../../utils/modelHelpers', () => ({
  shouldStripThinkingFromContext: vi.fn(() => false),
}));

vi.mock('../../utils/uiUtils', () => ({
  playCompletionSound: vi.fn(),
}));

vi.mock('../../utils/chat/ids', () => ({
  generateUniqueId: vi.fn(() => 'generated-session'),
}));

import { useImageEditSender } from './useImageEditSender';
import { renderHook } from '@/test/testUtils';

describe('useImageEditSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildContentPartsMock.mockResolvedValue({ contentParts: [{ text: 'edit this image' }] });
    createChatHistoryForApiMock.mockResolvedValue([]);
    editImageMock.mockResolvedValue([
      { text: 'Updated image', thoughtSignature: 'sig-text' },
      {
        inlineData: {
          mimeType: 'image/png',
          data: 'base64-image',
        },
        thoughtSignature: 'sig-image',
      },
    ]);
  });

  it('persists returned apiParts so image edits can participate in future turns', async () => {
    const updateAndPersistSessions = vi.fn();
    const setSessionLoading = vi.fn();
    const activeJobs = { current: new Map<string, AbortController>() };
    const setActiveSessionId = vi.fn();

    const { result, unmount } = renderHook(() =>
      useImageEditSender({
        updateAndPersistSessions,
        setSessionLoading,
        activeJobs,
        setActiveSessionId,
      }),
    );

    const abortController = new AbortController();

    await act(async () => {
      await result.current.handleImageEditMessage(
        'api-key',
        'session-1',
        [],
        'generation-1',
        abortController,
        {
          generateQuadImages: false,
          isCompletionSoundEnabled: false,
        } as any,
        {
          modelId: 'gemini-3.1-flash-image-preview',
          systemInstruction: '',
        } as any,
        'edit this image',
        [],
        null,
        '1:1',
        '2K',
        'IMAGE_TEXT',
        'ALLOW_ADULT',
      );
    });

    const finalUpdater = updateAndPersistSessions.mock.calls[1]?.[0];
    expect(finalUpdater).toBeTypeOf('function');

    const finalState = finalUpdater([
      {
        id: 'session-1',
        title: 'Session',
        timestamp: 1,
        settings: {} as any,
        messages: [
          {
            id: 'generation-1',
            role: 'model',
            content: '',
            isLoading: true,
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          },
        ],
      },
    ]);

    expect(finalState[0].messages[0]).toEqual(
      expect.objectContaining({
        content: 'Updated image',
        apiParts: [
          { text: 'Updated image', thoughtSignature: 'sig-text' },
          {
            inlineData: {
              mimeType: 'image/png',
              data: '',
            },
            thoughtSignature: 'sig-image',
          },
        ],
      }),
    );

    unmount();
  });
});
