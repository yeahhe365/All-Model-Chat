import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');
const markdownCssPath = path.join(projectRoot, 'src/styles/markdown.css');

describe('markdown table styling', () => {
  it('wraps wide markdown tables instead of forcing natural-width overflow', () => {
    const css = fs.readFileSync(markdownCssPath, 'utf8');

    expect(css).toContain('.markdown-body table:not(.rich-html-table)');
    expect(css).toContain('width: 100%;');
    expect(css).toContain('min-width: 100%;');
    expect(css).toContain('table-layout: fixed;');
    expect(css).toContain('overflow-wrap: anywhere;');
    expect(css).toContain('white-space: normal;');
    expect(css).not.toContain('width: max-content;');
    expect(css).not.toContain('white-space: nowrap;');
    expect(css).not.toContain('.markdown-body tbody td:first-child');
  });

  it('does not apply standard table resets to rich raw html tables', () => {
    const css = fs.readFileSync(markdownCssPath, 'utf8');

    expect(css).toContain('.markdown-body table:not(.rich-html-table) thead th');
    expect(css).toContain('.markdown-body table:not(.rich-html-table) tbody td');
    expect(css).toContain('.markdown-body table.rich-html-table');
    expect(css).not.toContain('.markdown-body thead th {');
    expect(css).not.toContain('.markdown-body tbody td {');
  });
});
