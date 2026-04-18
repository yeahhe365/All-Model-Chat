import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const useSlashCommandsPath = path.join(projectRoot, 'src/hooks/useSlashCommands.ts');

describe('useSlashCommands redundancy guards', () => {
  it('does not reference the unused onStopGenerating callback', () => {
    const source = fs.readFileSync(useSlashCommandsPath, 'utf8');

    expect(source).not.toContain('onStopGenerating');
  });
});
