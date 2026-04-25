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

  it('escapes metadata inserted into the exported HTML shell', () => {
    const html = generateExportHtmlTemplate({
      title: '<img src=x onerror=alert(1)>',
      date: '2026-04-26 <script>alert(2)</script>',
      model: 'gemini"><script>alert(3)</script>',
      contentHtml: '<div data-message-id="1">safe content</div>',
      styles: '',
      themeId: 'pearl',
      language: 'en',
      rootBgColor: '#ffffff',
      bodyClasses: 'antialiased',
    });

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('2026-04-26 &lt;script&gt;alert(2)&lt;/script&gt;');
    expect(html).toContain('gemini&quot;&gt;&lt;script&gt;alert(3)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>alert(3)</script>');
  });
});
