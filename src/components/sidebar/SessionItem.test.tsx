import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const sessionItemPath = path.resolve(__dirname, './SessionItem.tsx');

describe('SessionItem spacing', () => {
  it('adds a little more left padding so history titles do not sit against the sidebar edge', () => {
    const source = fs.readFileSync(sessionItemPath, 'utf8');

    expect(source).toContain('text-left pl-2.5 pr-1 py-2');
    expect(source).not.toContain('text-left px-1 py-2');
  });
});
