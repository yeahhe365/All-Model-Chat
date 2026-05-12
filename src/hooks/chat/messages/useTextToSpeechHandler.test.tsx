import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getKeyForRequestMock,
  getGeminiKeyForRequestMock,
  pcmBase64ToWavUrlMock,
  logInfoMock,
  logErrorMock,
  generateSpeechMock,
} = vi.hoisted(() => ({
  getKeyForRequestMock: vi.fn(),
  getGeminiKeyForRequestMock: vi.fn(),
  pcmBase64ToWavUrlMock: vi.fn(),
  logInfoMock: vi.fn(),
  logErrorMock: vi.fn(),
  generateSpeechMock: vi.fn(),
}));

vi.mock('@/utils/apiUtils', () => ({
  getKeyForRequest: getKeyForRequestMock,
  getGeminiKeyForRequest: getGeminiKeyForRequestMock,
}));

vi.mock('@/features/audio/audioProcessing', () => ({
  pcmBase64ToWavUrl: pcmBase64ToWavUrlMock,
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule({ info: logInfoMock, error: logErrorMock });
});

vi.mock('@/services/api/generation/audioApi', () => ({
  generateSpeechApi: generateSpeechMock,
}));

import { DEFAULT_APP_SETTINGS } from '@/constants/appConstants';
import type { ChatSettings } from '@/types';
import { useTextToSpeechHandler } from './useTextToSpeechHandler';
import { renderHook } from '@/test/testUtils';

const createChatSettings = (modelId: string): ChatSettings => ({
  ...DEFAULT_APP_SETTINGS,
  modelId,
});

describe('useTextToSpeechHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKeyForRequestMock.mockReturnValue({ key: 'api-key', isNewKey: false });
    getGeminiKeyForRequestMock.mockReturnValue({ key: 'api-key', isNewKey: false });
    generateSpeechMock.mockResolvedValue('pcm-base64');
    pcmBase64ToWavUrlMock.mockReturnValue('blob:wav-url');
  });

  it('reuses the active TTS model for quick text-to-speech playback', async () => {
    const { result, unmount } = renderHook(() =>
      useTextToSpeechHandler({
        appSettings: DEFAULT_APP_SETTINGS,
        currentChatSettings: createChatSettings('gemini-3.1-flash-tts-preview'),
      }),
    );

    const url = await result.current.handleQuickTTS('hello world');

    expect(url).toBe('blob:wav-url');
    expect(generateSpeechMock).toHaveBeenCalledWith(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      'hello world',
      DEFAULT_APP_SETTINGS.ttsVoice,
      expect.any(AbortSignal),
    );
    unmount();
  });

  it('falls back to the default TTS model when the active model is not a TTS model', async () => {
    const { result, unmount } = renderHook(() =>
      useTextToSpeechHandler({
        appSettings: DEFAULT_APP_SETTINGS,
        currentChatSettings: createChatSettings('gemini-3-flash-preview'),
      }),
    );

    await result.current.handleQuickTTS('hello world');

    expect(generateSpeechMock).toHaveBeenCalledWith(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      'hello world',
      DEFAULT_APP_SETTINGS.ttsVoice,
      expect.any(AbortSignal),
    );
    unmount();
  });

  it('uses the Gemini API key path for quick TTS while OpenAI-compatible mode is active', async () => {
    getKeyForRequestMock.mockReturnValue({ key: 'openai-key', isNewKey: true });
    getGeminiKeyForRequestMock.mockReturnValue({ key: 'gemini-key', isNewKey: true });

    const { result, unmount } = renderHook(() =>
      useTextToSpeechHandler({
        appSettings: {
          ...DEFAULT_APP_SETTINGS,
          isOpenAICompatibleApiEnabled: true,
          apiMode: 'openai-compatible',
          apiKey: 'gemini-key',
          openaiCompatibleApiKey: 'openai-key',
        },
        currentChatSettings: createChatSettings('gemini-3-flash-preview'),
      }),
    );

    await result.current.handleQuickTTS('hello world');

    expect(getGeminiKeyForRequestMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), {
      skipIncrement: true,
    });
    expect(getKeyForRequestMock).not.toHaveBeenCalled();
    expect(generateSpeechMock).toHaveBeenCalledWith(
      'gemini-key',
      'gemini-3.1-flash-tts-preview',
      'hello world',
      DEFAULT_APP_SETTINGS.ttsVoice,
      expect.any(AbortSignal),
    );
    unmount();
  });
});
