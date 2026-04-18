import { describe, expect, it } from 'vitest';
import { CONNECTION_TEST_MODELS, AVAILABLE_TRANSCRIPTION_MODELS } from './settingsModelOptions';

describe('settingsModelOptions', () => {
  it('keeps connection test models aligned with the supported defaults', () => {
    expect(CONNECTION_TEST_MODELS.map((model) => model.id)).toEqual([
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-3.1-pro-preview',
      'gemma-4-31b-it',
      'gemma-4-26b-a4b-it',
    ]);
  });

  it('does not expose removed Gemini 2.5 Flash preview models in connection tests', () => {
    expect(CONNECTION_TEST_MODELS.some((model) => model.id === 'gemini-2.5-flash-preview-09-2025')).toBe(false);
    expect(CONNECTION_TEST_MODELS.some((model) => model.id === 'gemini-2.5-flash-lite-preview-09-2025')).toBe(false);
  });

  it('does not expose removed Gemini 2.5 Flash preview models for transcription', () => {
    expect(AVAILABLE_TRANSCRIPTION_MODELS.some((model) => model.id === 'gemini-2.5-flash-preview-09-2025')).toBe(false);
    expect(AVAILABLE_TRANSCRIPTION_MODELS.some((model) => model.id === 'gemini-2.5-flash-lite-preview-09-2025')).toBe(false);
  });

  it('does not expose live-only native audio models for file transcription', () => {
    expect(AVAILABLE_TRANSCRIPTION_MODELS.some((model) => model.id === 'gemini-2.5-flash-native-audio-preview-12-2025')).toBe(false);
  });

  it('keeps transcription models aligned with the supported list', () => {
    expect(AVAILABLE_TRANSCRIPTION_MODELS.map((model) => model.id)).toEqual([
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-3.1-pro-preview',
    ]);
  });
});
