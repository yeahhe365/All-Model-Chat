import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateContentMock, getConfiguredApiClientMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  getConfiguredApiClientMock: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
}));

vi.mock('../../logService', () => ({
  logService: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    recordTokenUsage: vi.fn(),
  },
}));

import { generateSpeechApi } from './audioApi';

describe('generateSpeechApi request config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfiguredApiClientMock.mockResolvedValue({
      models: {
        generateContent: generateContentMock,
      },
    });
    generateContentMock.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'pcm-audio' } }] } }],
    });
  });

  it('uses the selected single-speaker voice for standard TTS prompts', async () => {
    await generateSpeechApi(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      'Say cheerfully: Have a wonderful day!',
      'Aoede',
      new AbortController().signal,
    );

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' },
            },
          },
        }),
      }),
    );
  });

  it('switches to multi-speaker voice config when the prompt declares speaker voices', async () => {
    await generateSpeechApi(
      'api-key',
      'gemini-3.1-flash-tts-preview',
      `# AUDIO PROFILE: Two hosts
### SPEAKER VOICES
Joe: Kore
Jane: Puck

#### TRANSCRIPT
Joe: Welcome back to the show.
Jane: Thanks, it is great to be here.`,
      'Aoede',
      new AbortController().signal,
    );

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Joe',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                  },
                },
                {
                  speaker: 'Jane',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' },
                  },
                },
              ],
            },
          },
        }),
      }),
    );
  });
});
