import { beforeEach, describe, expect, it, vi } from 'vitest';

const { blobToBase64Mock, generateContentMock, getConfiguredApiClientMock } = vi.hoisted(() => ({
  blobToBase64Mock: vi.fn(),
  generateContentMock: vi.fn(),
  getConfiguredApiClientMock: vi.fn(),
}));

vi.mock('../apiClient', () => ({
  getConfiguredApiClient: getConfiguredApiClientMock,
}));

vi.mock('../../../utils/fileHelpers', () => ({
  blobToBase64: blobToBase64Mock,
}));

vi.mock('../../logService', async () => {
  const { createMockLogService } = await import('../../../test/serviceTestDoubles');

  return { logService: createMockLogService() };
});

import { generateSpeechApi, transcribeAudioApi } from './audioApi';

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

describe('transcribeAudioApi request config', () => {
  const audioFile = new File(['voice'], 'voice.webm', { type: 'audio/webm' });

  beforeEach(() => {
    vi.clearAllMocks();
    blobToBase64Mock.mockResolvedValue('base64-audio');
    getConfiguredApiClientMock.mockResolvedValue({
      models: {
        generateContent: generateContentMock,
      },
    });
    generateContentMock.mockResolvedValue({ text: 'hello world' });
  });

  it('instructs the model to transcribe voice input without translating or rewriting it', async () => {
    await transcribeAudioApi('api-key', audioFile, 'gemini-3-flash-preview');

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: {
          parts: [
            { text: 'Transcribe voice input exactly.' },
            {
              inlineData: {
                mimeType: 'audio/webm',
                data: 'base64-audio',
              },
            },
          ],
        },
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('只做 ASR'),
        }),
      }),
    );

    const request = generateContentMock.mock.calls[0][0];
    expect(request.config.systemInstruction).toContain('保持原始语言和混合语言');
    expect(request.config.systemInstruction).toContain('不要翻译、总结、回答、解释或描述音频');
    expect(request.config.systemInstruction).toContain(
      '尽量保留原词、语气词、代码、命令、URL、邮箱、数字、单位和专有名词',
    );
    expect(request.config.systemInstruction).toContain('不要补写音频中不存在的内容');
  });

  it('returns an empty string when the model finds no recognizable speech', async () => {
    generateContentMock.mockResolvedValue({ text: '' });

    await expect(transcribeAudioApi('api-key', audioFile, 'gemini-3-flash-preview')).resolves.toBe('');
  });
});
