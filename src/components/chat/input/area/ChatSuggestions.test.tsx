import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const chatSuggestionsPath = path.resolve(__dirname, './ChatSuggestions.tsx');
const suggestionIconPath = path.resolve(__dirname, './SuggestionIcon.tsx');

describe('ChatSuggestions button sizing', () => {
  it('uses twenty-percent smaller suggestion button padding', () => {
    const source = fs.readFileSync(chatSuggestionsPath, 'utf8');

    expect(source).toContain('gap-[0.3rem] sm:gap-[0.4rem] px-[0.6rem] py-[0.4rem] sm:px-[0.8rem] sm:py-[0.5rem]');
    expect(source).not.toContain('gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5');
  });

  it('uses twenty-percent smaller suggestion icons', () => {
    const source = fs.readFileSync(suggestionIconPath, 'utf8');

    expect(source).toContain('const size = 13;');
    expect(source).not.toContain('const size = 16;');
  });
});
