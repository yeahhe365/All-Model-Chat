import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getModelIcon } from './ModelPicker';

describe('getModelIcon', () => {
  it('uses the Gemini text icon for both Gemini and Gemma models', () => {
    const geminiMarkup = renderToStaticMarkup(
      getModelIcon({ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }),
    );
    const gemmaMarkup = renderToStaticMarkup(
      getModelIcon({ id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' }),
    );

    expect(geminiMarkup).toContain('lucide-message-square-text');
    expect(gemmaMarkup).toContain('lucide-message-square-text');
  });
});
