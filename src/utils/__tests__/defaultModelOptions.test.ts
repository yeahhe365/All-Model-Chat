import { describe, expect, it } from 'vitest';
import { getDefaultModelOptions } from '../defaultModelOptions';

describe('getDefaultModelOptions', () => {
  it('includes the current Gemini 3.1 Flash Live model in pinned defaults', () => {
    const models = getDefaultModelOptions();

    expect(models.some((model) => model.id === 'gemini-3.1-flash-live-preview')).toBe(true);
  });

  it('includes Gemini Robotics-ER 1.6 in pinned defaults', () => {
    const models = getDefaultModelOptions();

    expect(models.some((model) => model.id === 'gemini-robotics-er-1.6-preview')).toBe(true);
  });

  it('keeps only the supported TTS defaults pinned', () => {
    const models = getDefaultModelOptions();
    const ttsIds = models
      .filter((model) => model.id.includes('-tts'))
      .map((model) => model.id)
      .sort();

    expect(ttsIds).toEqual([
      'gemini-3.1-flash-tts-preview',
    ]);
  });

  it('does not include removed Gemini 2.5 Flash preview models', () => {
    const models = getDefaultModelOptions();

    expect(models.some((model) => model.id === 'gemini-2.5-flash-preview-09-2025')).toBe(false);
    expect(models.some((model) => model.id === 'gemini-2.5-flash-lite-preview-09-2025')).toBe(false);
    expect(models.some((model) => model.id === 'gemini-2.5-flash-native-audio-preview-12-2025')).toBe(false);
  });
});
