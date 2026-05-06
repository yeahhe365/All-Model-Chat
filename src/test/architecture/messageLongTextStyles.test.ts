import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');
const markdownCssPath = path.join(projectRoot, 'src/styles/markdown.css');

describe('message long text styling', () => {
  it('allows long unbroken message text to wrap inside the bubble', () => {
    const css = fs.readFileSync(markdownCssPath, 'utf8');

    expect(css).toContain('.message-content-container .markdown-body');
    expect(css).toContain('max-width: 100%;');
    expect(css).toContain('min-width: 0;');
    expect(css).toContain('overflow-wrap: anywhere;');
    expect(css).toContain('word-break: break-word;');
  });
});
