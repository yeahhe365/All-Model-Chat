import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppSettings, createChatSettings } from '@/test/factories';

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

vi.mock('../../services/api/generation/imageEditApi', () => ({
  editImageApi: editImageMock,
}));

vi.mock('../../utils/chat/builder', () => ({
  buildContentParts: buildContentPartsMock,
  createChatHistoryForApi: createChatHistoryForApiMock,
}));

vi.mock('../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

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

import { sendImageEditMessage } from './imageEditStrategy';

describe('imageEditStrategy', () => {
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
    const setActiveSessionId = vi.fn();
    const runMessageLifecycle = vi.fn(async ({ execute }) => execute());

    const abortController = new AbortController();

    await act(async () => {
      await sendImageEditMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        messages: [],
        generationId: 'generation-1',
        abortController,
        appSettings: createAppSettings({
          generateQuadImages: false,
          isCompletionSoundEnabled: false,
        }),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-3.1-flash-image-preview',
          systemInstruction: '',
        }),
        text: 'edit this image',
        files: [],
        editingMessageId: null,
        aspectRatio: '1:1',
        imageSize: '2K',
        imageOutputMode: 'IMAGE_TEXT',
        personGeneration: 'ALLOW_ADULT',
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    const finalUpdater = updateAndPersistSessions.mock.calls[1]?.[0];
    expect(finalUpdater).toBeTypeOf('function');

    const finalState = finalUpdater([
      {
        id: 'session-1',
        title: 'Session',
        timestamp: 1,
        settings: createChatSettings(),
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
    expect(runMessageLifecycle).toHaveBeenCalledOnce();
  });
});
