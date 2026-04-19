import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const chatInputAreaPath = path.resolve(__dirname, './ChatInputArea.tsx');

describe('ChatInputArea default spacing', () => {
  it('uses the reduced default vertical padding for the non-fullscreen input container', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');

    expect(source).toContain('px-3 py-[0.54rem] sm:px-4 sm:py-[0.72rem]');
    expect(source).not.toContain('bg-[var(--theme-bg-input)] p-3 sm:p-4');
  });

  it('doubles the non-fullscreen bottom safe-area spacing below the input area', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');

    expect(source).toContain('pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]');
    expect(source).not.toContain('pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]');
  });
});
