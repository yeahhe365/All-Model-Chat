import { describe, expect, it } from 'vitest';
import {
  getModelCapabilities,
  getModelDescriptor,
  normalizeModelId,
} from '../modelCatalog';

describe('modelCatalog', () => {
  it('normalizes models/ prefixed identifiers', () => {
    expect(normalizeModelId('models/gemini-3.1-flash-image-preview')).toBe(
      'gemini-3.1-flash-image-preview'
    );
  });

  it('resolves descriptors through alias normalization', () => {
    const descriptor = getModelDescriptor('models/gemini-3.1-pro-preview');

    expect(descriptor?.id).toBe('gemini-3.1-pro-preview');
    expect(descriptor?.family).toBe('gemini-3');
    expect(descriptor?.supportsThinkingLevel).toBe(true);
    expect(descriptor?.mandatoryThinking).toBe(true);
  });

  it('returns structured capabilities for Gemini image models', () => {
    expect(getModelCapabilities('gemini-3.1-flash-image-preview')).toEqual({
      isGemini3: true,
      isGemini3ImageModel: true,
      isImagenModel: true,
      isNativeAudioModel: false,
      isTtsModel: false,
      supportedAspectRatios: ['Auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9'],
      supportedImageSizes: ['1K', '2K', '4K'],
    });
  });

  it('distinguishes native audio and live models from standard chat models', () => {
    expect(getModelCapabilities('gemini-2.5-flash-native-audio-preview-12-2025')).toMatchObject({
      isGemini3: false,
      isNativeAudioModel: true,
      isTtsModel: false,
      isImagenModel: false,
    });

    expect(getModelDescriptor('gemini-3.1-flash-live-preview')).toMatchObject({
      id: 'gemini-3.1-flash-live-preview',
      family: 'gemini-3',
      supportsLive: true,
    });
  });
});
