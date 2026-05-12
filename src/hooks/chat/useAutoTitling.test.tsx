import { renderHook } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '@/constants/appConstants';
import type { SavedChatSession } from '@/types';
import { useAutoTitling } from './useAutoTitling';

const { generateTitleApiMock, getGeminiKeyForRequestMock } = vi.hoisted(() => ({
  generateTitleApiMock: vi.fn(),
  getGeminiKeyForRequestMock: vi.fn(),
}));

vi.mock('@/services/api/generation/textApi', () => ({
  generateTitleApi: generateTitleApiMock,
}));

vi.mock('@/utils/apiUtils', () => ({
  getGeminiKeyForRequest: getGeminiKeyForRequestMock,
}));

vi.mock('@/services/logService', async () => {
  const { createLogServiceMockModule } = await import('@/test/moduleMockDoubles');

  return createLogServiceMockModule();
});

const createSession = (): SavedChatSession => ({
  id: 'session-1',
  title: 'New Chat',
  timestamp: 1,
  settings: {
    ...DEFAULT_APP_SETTINGS,
    modelId: 'gemini-3-flash-preview',
  },
  messages: [
    {
      id: 'message-user',
      role: 'user',
      content: 'Explain routing',
      timestamp: new Date('2026-05-09T00:00:00.000Z'),
    },
    {
      id: 'message-model',
      role: 'model',
      content: 'Routing decides which handler receives a request.',
      timestamp: new Date('2026-05-09T00:00:01.000Z'),
    },
  ],
});

describe('useAutoTitling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGeminiKeyForRequestMock.mockReturnValue({ key: 'gemini-key', isNewKey: true });
    generateTitleApiMock.mockResolvedValue('Routing Basics');
  });

  it('uses a Gemini key instead of the OpenAI sticky key while OpenAI-compatible mode is active', async () => {
    const updateAndPersistSessions = vi.fn();
    const sessionKeyMapRef = {
      current: new Map([['session-1', 'openai-key']]),
    };

    const { unmount } = renderHook(() =>
      useAutoTitling({
        appSettings: {
          ...DEFAULT_APP_SETTINGS,
          isOpenAICompatibleApiEnabled: true,
          apiMode: 'openai-compatible',
          apiKey: 'gemini-key',
          openaiCompatibleApiKey: 'openai-key',
        },
        activeChat: createSession(),
        updateAndPersistSessions,
        language: 'en',
        generatingTitleSessionIds: new Set(),
        setGeneratingTitleSessionIds: vi.fn(),
        sessionKeyMapRef,
      }),
    );

    await vi.waitFor(() => {
      expect(generateTitleApiMock).toHaveBeenCalledWith(
        'gemini-key',
        'Explain routing',
        'Routing decides which handler receives a request.',
        'en',
      );
    });
    expect(getGeminiKeyForRequestMock).toHaveBeenCalled();
    unmount();
  });
});
