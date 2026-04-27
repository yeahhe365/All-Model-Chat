import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Part } from '@google/genai';

const buildGenerationConfigMock = vi.fn();
const sendStatelessMessageNonStreamApiMock = vi.fn();

vi.mock('./api/generationConfig', () => ({
  buildGenerationConfig: buildGenerationConfigMock,
}));

vi.mock('./api/chatApi', () => ({
  sendStatelessMessageStreamApi: vi.fn(),
  sendStatelessMessageNonStreamApi: sendStatelessMessageNonStreamApiMock,
}));

vi.mock('./api/fileApi', () => ({
  uploadFileApi: vi.fn(),
  getFileMetadataApi: vi.fn(),
}));

vi.mock('./api/generation/imageApi', () => ({
  generateImagesApi: vi.fn(),
}));

vi.mock('./api/generation/audioApi', () => ({
  generateSpeechApi: vi.fn(),
  transcribeAudioApi: vi.fn(),
}));

vi.mock('./api/generation/textApi', () => ({
  generateTitleApi: vi.fn(),
  generateSuggestionsApi: vi.fn(),
  translateTextApi: vi.fn(),
}));

vi.mock('./api/generation/tokenApi', () => ({
  countTokensApi: vi.fn(),
}));

vi.mock('./logService', () => ({
  logService: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('geminiService.editImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses shared generation config for image edits', async () => {
    buildGenerationConfigMock.mockResolvedValue({
      responseModalities: ['TEXT', 'IMAGE'],
      thinkingConfig: { includeThoughts: true, thinkingLevel: 'HIGH' },
      tools: [{ googleSearch: {} }],
    });

    sendStatelessMessageNonStreamApiMock.mockImplementation(
      async (
        _apiKey: string,
        _modelId: string,
        _history: unknown,
        _parts: unknown,
        config: unknown,
        _abortSignal: AbortSignal,
        _onError: (error: Error) => void,
        onComplete: (parts: Part[]) => void,
      ) => {
        onComplete([{ text: 'edited' }]);
        return config;
      },
    );

    const { geminiServiceInstance } = await import('./geminiService');

    await geminiServiceInstance.editImage(
      'key',
      'gemini-3.1-flash-image-preview',
      [],
      [{ text: 'edit this image' }],
      new AbortController().signal,
      '1:1',
      '2K',
      {
        systemInstruction: 'Keep the composition intact.',
        showThoughts: true,
        thinkingBudget: 0,
        thinkingLevel: 'HIGH',
        isGoogleSearchEnabled: true,
      },
    );

    expect(buildGenerationConfigMock).toHaveBeenCalled();
    expect(sendStatelessMessageNonStreamApiMock).toHaveBeenCalledWith(
      'key',
      'gemini-3.1-flash-image-preview',
      [],
      [{ text: 'edit this image' }],
      expect.objectContaining({
        thinkingConfig: { includeThoughts: true, thinkingLevel: 'HIGH' },
        tools: [{ googleSearch: {} }],
      }),
      expect.any(AbortSignal),
      expect.any(Function),
      expect.any(Function),
    );
  });
});
