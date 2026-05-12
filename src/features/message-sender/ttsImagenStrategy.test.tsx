import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranslator } from '@/i18n/translations';
import { createAppSettings, createChatSettings } from '@/test/factories';

const {
  handleApiErrorMock,
  generateImagesMock,
  generateSpeechMock,
  performOptimisticSessionUpdateMock,
  createUploadedFileFromBase64Mock,
  showNotificationMock,
} = vi.hoisted(() => ({
  handleApiErrorMock: vi.fn(),
  generateImagesMock: vi.fn(),
  generateSpeechMock: vi.fn(),
  performOptimisticSessionUpdateMock: vi.fn((prev: unknown) => prev),
  createUploadedFileFromBase64Mock: vi.fn((data: string, type: string, name: string) => ({
    id: `${name}-id`,
    name,
    type,
    size: data.length,
  })),
  showNotificationMock: vi.fn(),
}));

vi.mock('./useApiErrorHandler', () => ({
  useApiErrorHandler: () => ({
    handleApiError: handleApiErrorMock,
  }),
}));

vi.mock('@/services/api/generation/imageApi', () => ({
  generateImagesApi: generateImagesMock,
}));

vi.mock('@/services/api/generation/audioApi', () => ({
  generateSpeechApi: generateSpeechMock,
}));

vi.mock('@/features/audio/audioProcessing', () => ({
  pcmBase64ToWavUrl: vi.fn(() => 'blob:wav-url'),
}));

vi.mock('@/utils/uiUtils', () => ({
  showNotification: showNotificationMock,
  playCompletionSound: vi.fn(),
}));

vi.mock('@/utils/chat/session', () => ({
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

vi.mock('@/utils/chat/parsing', () => ({
  createUploadedFileFromBase64: createUploadedFileFromBase64Mock,
}));

vi.mock('@/utils/chat/ids', () => ({
  generateUniqueId: vi.fn(() => 'generated-session'),
}));

import { sendTtsImagenMessage } from './ttsImagenStrategy';

describe('ttsImagenStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateImagesMock.mockResolvedValue(['image-1', 'image-2', 'image-3', 'image-4']);
    generateSpeechMock.mockResolvedValue('pcm-audio');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
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
        t: getTranslator('en'),
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

  it('uses translated Imagen message content, error prefix, and notification text', async () => {
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    const runMessageLifecycle = vi.fn(async ({ execute }) => execute());
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });

    await act(async () => {
      await sendTtsImagenMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings({
          generateQuadImages: false,
          isCompletionSoundEnabled: false,
          isCompletionNotificationEnabled: true,
        }),
        currentChatSettings: createChatSettings({
          modelId: 'imagen-4.0-generate-001',
        }),
        text: '画一只机械猫',
        aspectRatio: '1:1',
        imageSize: '2K',
        personGeneration: 'ALLOW_ADULT',
        t: getTranslator('zh'),
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    expect(runMessageLifecycle).toHaveBeenCalledWith(expect.objectContaining({ errorPrefix: '图像生成错误' }));

    const finalUpdater = updateAndPersistSessions.mock.calls[1]?.[0];
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
        content: '已为“画一只机械猫”生成 4 张图片',
      }),
    );
    expect(showNotificationMock).toHaveBeenCalledWith(
      '图片已生成',
      expect.objectContaining({
        body: '图片已生成。',
      }),
    );
  });

  it('uses translated TTS error prefix and notification text', async () => {
    const updateAndPersistSessions = vi.fn();
    const setActiveSessionId = vi.fn();
    const runMessageLifecycle = vi.fn(async ({ execute }) => execute());
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });

    await act(async () => {
      await sendTtsImagenMessage({
        keyToUse: 'api-key',
        activeSessionId: 'session-1',
        generationId: 'generation-1',
        abortController: new AbortController(),
        appSettings: createAppSettings({
          generateQuadImages: false,
          isCompletionSoundEnabled: false,
          isCompletionNotificationEnabled: true,
        }),
        currentChatSettings: createChatSettings({
          modelId: 'gemini-2.5-flash-preview-tts',
          ttsVoice: 'Kore',
        }),
        text: '你好',
        aspectRatio: '1:1',
        imageSize: undefined,
        personGeneration: 'ALLOW_ADULT',
        t: getTranslator('zh'),
        updateAndPersistSessions,
        setActiveSessionId,
        runMessageLifecycle,
      });
    });

    expect(runMessageLifecycle).toHaveBeenCalledWith(expect.objectContaining({ errorPrefix: '语音生成错误' }));
    expect(showNotificationMock).toHaveBeenCalledWith(
      '音频已生成',
      expect.objectContaining({
        body: '文本转语音音频已生成。',
      }),
    );
  });
});
