import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getModelIcon } from './ModelPicker';

describe('getModelIcon', () => {
  it('renders picker icons at the larger shared size', () => {
    const geminiMarkup = renderToStaticMarkup(
      getModelIcon({ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }),
    );

    expect(geminiMarkup).toContain('width="18"');
    expect(geminiMarkup).toContain('height="18"');
  });

  it('uses a sparkles icon for Gemini general models', () => {
    const geminiMarkup = renderToStaticMarkup(
      getModelIcon({ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }),
    );

    expect(geminiMarkup).toContain('lucide-sparkles');
  });

  it('uses a layers icon for Gemma models', () => {
    const gemmaMarkup = renderToStaticMarkup(getModelIcon({ id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' }));

    expect(gemmaMarkup).toContain('lucide-layers3');
  });

  it('uses a speech icon for TTS models', () => {
    const ttsMarkup = renderToStaticMarkup(
      getModelIcon({ id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 Flash TTS Preview' }),
    );

    expect(ttsMarkup).toContain('lucide-speech');
  });

  it('uses a banana icon for Gemini image models', () => {
    const geminiImageMarkup = renderToStaticMarkup(
      getModelIcon({ id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro' }),
    );

    expect(geminiImageMarkup).toContain('lucide-banana');
  });

  it('uses an image icon for Imagen models', () => {
    const imagenMarkup = renderToStaticMarkup(getModelIcon({ id: 'imagen-4.0-generate-001', name: 'Imagen 4.0' }));

    expect(imagenMarkup).toContain('lucide-image');
    expect(imagenMarkup).not.toContain('lucide-image-plus');
  });

  it('uses a scan eye icon for Gemini Robotics models', () => {
    const roboticsMarkup = renderToStaticMarkup(
      getModelIcon({ id: 'gemini-robotics-er-1.6-preview', name: 'Gemini Robotics-ER 1.6 Preview' }),
    );

    expect(roboticsMarkup).toContain('lucide-scan-eye');
    expect(roboticsMarkup).not.toContain('lucide-message-square-text');
  });
});
