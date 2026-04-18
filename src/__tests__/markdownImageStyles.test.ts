import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const markdownCssPath = path.join(projectRoot, 'src/styles/markdown.css');

describe('markdown image styling', () => {
  it('caps markdown image height and keeps containment styling', () => {
    const css = fs.readFileSync(markdownCssPath, 'utf8');

    expect(css).toContain('max-height: 320px;');
    expect(css).toContain('object-fit: contain;');
    expect(css).toContain('background-color: var(--theme-bg-tertiary);');
  });
});
