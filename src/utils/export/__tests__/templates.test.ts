import { describe, expect, it } from 'vitest';
import { generateExportHtmlTemplate } from '../templates';

describe('generateExportHtmlTemplate', () => {
  it('does not depend on remote CDN scripts for syntax highlighting', () => {
    const html = generateExportHtmlTemplate({
      title: 'Test Export',
      date: '2026-04-11 12:00:00',
      model: 'gemini-test',
      contentHtml: '<pre><code class="hljs language-ts">const x = 1;</code></pre>',
      styles: '<style>.hljs { color: red; }</style>',
      themeId: 'onyx',
      language: 'en',
      rootBgColor: '#000000',
      bodyClasses: 'antialiased',
    });

    expect(html).not.toContain('cdnjs.cloudflare.com');
    expect(html).not.toContain('highlight.min.js');
  });

  it('does not rely on stale message animation class names when exporting', () => {
    const html = generateExportHtmlTemplate({
      title: 'Test Export',
      date: '2026-04-11 12:00:00',
      model: 'gemini-test',
      contentHtml: '<div data-message-id="1">hello</div>',
      styles: '',
      themeId: 'onyx',
      language: 'en',
      rootBgColor: '#000000',
      bodyClasses: 'antialiased',
    });

    expect(html).not.toContain('message-container-animate');
  });
});
