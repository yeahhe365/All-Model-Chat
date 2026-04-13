import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const indexHtmlPath = path.join(projectRoot, 'index.html');

describe('index.html runtime bootstrapping', () => {
  it('does not include import maps or synchronous runtime CDN scripts', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');

    expect(html).not.toContain('type="importmap"');
    expect(html).not.toContain('https://cdn.tailwindcss.com');
    expect(html).not.toContain('cdnjs.cloudflare.com/ajax/libs/viz.js');
    expect(html).not.toContain('html2pdf.bundle.min.js');
    expect(html).not.toContain('cdnjs.cloudflare.com/ajax/libs/github-markdown-css');
    expect(html).not.toContain('cdnjs.cloudflare.com/ajax/libs/highlight.js');
    expect(html).not.toContain('cdnjs.cloudflare.com/ajax/libs/font-awesome');
  });
});
