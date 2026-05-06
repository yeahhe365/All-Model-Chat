import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');

const toolbarSelectorPaths = [
  'src/components/chat/input/toolbar/PersonGenerationSelector.tsx',
  'src/components/chat/input/toolbar/ImageOutputModeSelector.tsx',
  'src/components/chat/input/toolbar/MediaResolutionSelector.tsx',
  'src/components/chat/input/toolbar/ImagenAspectRatioSelector.tsx',
  'src/components/chat/input/toolbar/TtsVoiceSelector.tsx',
];

describe('chat input toolbar dropdown direction', () => {
  it('opens toolbar select menus upward to stay above the composer', () => {
    for (const relativePath of toolbarSelectorPaths) {
      const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
      expect(source).toContain('direction="up"');
    }
  });
});
