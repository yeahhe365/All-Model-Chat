import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppSettings, createChatSettings } from '@/test/factories';

const { handleApiErrorMock, generateImagesMock, performOptimisticSessionUpdateMock, createUploadedFileFromBase64Mock } =
  vi.hoisted(() => ({
    handleApiErrorMock: vi.fn(),
    generateImagesMock: vi.fn(),
    performOptimisticSessionUpdateMock: vi.fn((prev: unknown) => prev),
    createUploadedFileFromBase64Mock: vi.fn((data: string, type: string, name: string) => ({
      id: `${name}-id`,
      name,
      type,
      size: data.length,
    })),
  }));

vi.mock('./useApiErrorHandler', () => ({
  useApiErrorHandler: () => ({
    handleApiError: handleApiErrorMock,
  }),
}));

vi.mock('../../services/api/generation/imageApi', () => ({
  generateImagesApi: generateImagesMock,
}));

vi.mock('../../services/api/generation/audioApi', () => ({
  generateSpeechApi: vi.fn(),
}));

vi.mock('../../utils/audio/audioProcessing', () => ({
  pcmBase64ToWavUrl: vi.fn(() => 'blob:wav-url'),
}));

vi.mock('../../utils/uiUtils', () => ({
  showNotification: vi.fn(),
  playCompletionSound: vi.fn(),
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

vi.mock('../../utils/chat/ids', () => ({
  generateUniqueId: vi.fn(() => 'generated-session'),
}));

import { sendTtsImagenMessage } from './ttsImagenStrategy';

describe('ttsImagenStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateImagesMock.mockResolvedValue(['image-1', 'image-2', 'image-3', 'image-4']);
  });

  it('uses a single Imagen request with numberOfImages when quad generation is enabled', async () => {
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    const runMessageLifecycle = vi.fn(async ({ execute }) => execute());

    const abortController = new AbortController();

    await act(async () => {
      await sendTtsImagenMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController,
        appSettings: createAppSettings({
          generateQuadImages: true,
          isCompletionSoundEnabled: false,
          isCompletionNotificationEnabled: false,
        }),
        currentChatSettings: createChatSettings({
          modelId: 'imagen-4.0-generate-001',
        }),
        text: 'draw a robot skateboard squad',
        aspectRatio: '1:1',
        imageSize: '2K',
        personGeneration: 'ALLOW_ADULT',
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    expect(generateImagesMock).toHaveBeenCalledTimes(1);
    expect(generateImagesMock).toHaveBeenCalledWith(
      'api-key',
      'imagen-4.0-generate-001',
      'draw a robot skateboard squad',
      '1:1',
      '2K',
      abortController.signal,
      expect.objectContaining({
        numberOfImages: 4,
      }),
    );

    expect(runMessageLifecycle).toHaveBeenCalledOnce();
  });
});
