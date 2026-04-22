import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const markdownCssPath = path.join(projectRoot, 'src/styles/markdown.css');

describe('markdown table styling', () => {
  it('prefers natural-width tables and avoids first-column-only emphasis rules', () => {
    const css = fs.readFileSync(markdownCssPath, 'utf8');

    expect(css).toContain('width: max-content;');
    expect(css).toContain('min-width: 100%;');
    expect(css).not.toContain('.markdown-body tbody td:first-child');
  });
});
