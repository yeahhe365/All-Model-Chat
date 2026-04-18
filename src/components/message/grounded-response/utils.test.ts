import { describe, expect, it } from 'vitest';

import { extractSources, insertCitations } from './utils';

describe('grounded-response utils', () => {
  it('extracts attribution sources from image grounding chunks', () => {
    const sources = extractSources({
      groundingChunks: [
        {
          image: {
            sourceUri: 'https://example.com/quetzal',
            imageUri: 'https://images.example.com/quetzal.jpg',
            title: 'Resplendent Quetzal',
            domain: 'example.com',
          },
        },
      ],
    });

    expect(sources).toEqual([
      {
        uri: 'https://example.com/quetzal',
        title: 'Resplendent Quetzal',
      },
    ]);
  });

  it('inserts citations for image grounding chunks using the attribution source uri', () => {
    const text = 'Grounded visual summary';
    const content = insertCitations(text, {
      groundingChunks: [
        {
          image: {
            sourceUri: 'https://example.com/quetzal',
            imageUri: 'https://images.example.com/quetzal.jpg',
            title: 'Resplendent Quetzal',
            domain: 'example.com',
          },
        },
      ],
      groundingSupports: [
        {
          segment: { endIndex: text.length },
          groundingChunkIndices: [0],
        },
      ],
    });

    expect(content).toContain('href="https://example.com/quetzal"');
    expect(content).toContain('[1]</a>');
  });
});
