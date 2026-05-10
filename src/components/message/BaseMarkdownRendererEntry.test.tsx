import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { BaseMarkdownRendererEntry } from './BaseMarkdownRendererEntry';

describe('BaseMarkdownRendererEntry', () => {
  const renderer = setupTestRenderer();

  it('renders bold text when quoted emphasis is adjacent to surrounding CJK text', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content="遇到的**“不定式”**问题。"
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const strong = renderer.container.querySelector('strong');

    expect(renderer.container.textContent).toBe('遇到的“不定式”问题。');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('“不定式”');
  });

  it('renders bold text when wrapped quotes are followed by additional CJK text inside emphasis', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content="这句话听起来像是一个**“反差萌”的幽默表达**"
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const strong = renderer.container.querySelector('strong');

    expect(renderer.container.textContent).toBe('这句话听起来像是一个“反差萌”的幽默表达');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('“反差萌”的幽默表达');
  });

  it('renders bold title text that ends with punctuation before adjacent content', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content="**背景：**这是说明。"
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const strong = renderer.container.querySelector('strong');

    expect(renderer.container.textContent).toBe('背景：这是说明。');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('背景：');
  });

  it('renders wrapped and title-style fallback bold text in the same paragraph', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content="先看**“不定式”**，再看**背景：**这是说明。"
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const strongTexts = Array.from(renderer.container.querySelectorAll('strong')).map((strong) => strong.textContent);

    expect(renderer.container.textContent).toBe('先看“不定式”，再看背景：这是说明。');
    expect(strongTexts).toEqual(['“不定式”', '背景：']);
  });

  it('renders underscored bold text adjacent to CJK text', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content="这是__重点__内容。"
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const strong = renderer.container.querySelector('strong');

    expect(renderer.container.textContent).toBe('这是重点内容。');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('重点');
  });

  it('keeps underscore markers literal inside ASCII identifiers', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content="Keep foo__bar__baz literal."
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(renderer.container.textContent).toBe('Keep foo__bar__baz literal.');
    expect(renderer.container.querySelector('strong')).toBeNull();
  });

  it('keeps quoted emphasis markers literal inside inline code', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content="示例：`遇到的**“不定式”**问题。`"
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const code = renderer.container.querySelector('code');

    expect(code?.textContent).toBe('遇到的**“不定式”**问题。');
    expect(renderer.container.querySelector('strong')).toBeNull();
  });

  it('preserves html table captions when raw html is allowed', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={
            'Inline raw HTML:\n\n<table><caption>Monthly totals</caption><thead><tr><th>Name</th><th>Total</th></tr></thead><tbody><tr><td>Alice</td><td>42</td></tr></tbody></table>'
          }
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const caption = renderer.container.querySelector('caption');

    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe('Monthly totals');
  });

  it('renders generated files inside sanitized tool result blocks', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={
            '<div class="tool-result outcome-ok"><strong>Execution Result (OK):</strong><pre><code>plot saved</code></pre></div>'
          }
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
          files={[
            {
              id: 'generated-plot',
              name: 'generated-plot.png',
              type: 'image/png',
              size: 12,
              dataUrl: 'blob:generated-plot',
              uploadState: 'active',
            },
          ]}
        />,
      );
    });

    const generatedOutputLabel = renderer.container.textContent || '';
    const image = renderer.container.querySelector('img');

    expect(generatedOutputLabel).toContain('Generated Output Files');
    expect(image?.getAttribute('src')).toBe('blob:generated-plot');
  });

  it('preserves safe inline styles in allowed raw html', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={
            'Inline raw HTML:\n\n' +
            '<div style="display:flex;gap:12px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;padding:20px 16px">' +
            '<table style="width:100%;border-collapse:collapse;text-align:center">' +
            '<tbody><tr><td style="padding:12px 16px"><span style="background:#e8f5e9;color:#2e7d32;border-radius:20px">Ready</span></td></tr></tbody>' +
            '</table></div>'
          }
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const wrapper = renderer.container.querySelector('div[style*="display"]');
    const table = renderer.container.querySelector('table');
    const cell = renderer.container.querySelector('td');
    const badge = renderer.container.querySelector('span');
    const wrapperStyle = wrapper?.getAttribute('style')?.replace(/\s+/g, '');
    const tableStyle = table?.getAttribute('style')?.replace(/\s+/g, '');
    const cellStyle = cell?.getAttribute('style')?.replace(/\s+/g, '');
    const badgeStyle = badge?.getAttribute('style')?.replace(/\s+/g, '');

    expect(wrapperStyle).toContain('display:flex');
    expect(wrapperStyle).toContain('background:linear-gradient(135deg');
    expect(wrapperStyle).toContain('border-radius:12px');
    expect(tableStyle).toContain('border-collapse:collapse');
    expect(cellStyle).toContain('padding:12px16px');
    expect(badgeStyle).toContain('border-radius:20px');
  });

  it('preserves richer safe controls and svg primitives in allowed raw html', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={
            'Inline raw HTML:\n\n' +
            '<section style="display:grid;grid-template-columns:1fr auto;align-content:center;justify-items:start;aspect-ratio:2/1">' +
            '<label for="tone">Tone</label>' +
            '<input id="tone" type="range" min="0" max="10" value="7" aria-label="Tone" />' +
            '<button type="button" disabled>Preview</button>' +
            '<progress value="70" max="100">70%</progress>' +
            '<meter min="0" max="100" value="70">70</meter>' +
            '<svg viewBox="0 0 120 40" width="120" height="40" role="img" aria-label="trend">' +
            '<rect x="0" y="0" width="120" height="40" fill="#eef2ff" />' +
            '<circle cx="24" cy="20" r="8" fill="#4f46e5" />' +
            '<text x="42" y="24" fill="#111827">OK</text>' +
            '</svg>' +
            '</section>'
          }
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const sectionStyle = renderer.container.querySelector('section')?.getAttribute('style')?.replace(/\s+/g, '');

    expect(sectionStyle).toContain('display:grid');
    expect(sectionStyle).toContain('grid-template-columns:1frauto');
    expect(sectionStyle).toContain('align-content:center');
    expect(sectionStyle).toContain('justify-items:start');
    expect(sectionStyle).toContain('aspect-ratio:2/1');
    expect(renderer.container.querySelector('label')?.getAttribute('for')).toBe('tone');
    expect(renderer.container.querySelector('input[type="range"]')?.getAttribute('value')).toBe('7');
    expect(renderer.container.querySelector('button[disabled]')?.textContent).toBe('Preview');
    expect(renderer.container.querySelector('progress')?.getAttribute('value')).toBe('70');
    expect(renderer.container.querySelector('meter')?.getAttribute('value')).toBe('70');
    expect(renderer.container.querySelector('rect')?.getAttribute('fill')).toBe('#eef2ff');
    expect(renderer.container.querySelector('circle')?.getAttribute('r')).toBe('8');
    expect(renderer.container.querySelector('text')?.textContent).toBe('OK');
  });

  it('marks styled raw html tables as rich tables so inline styles can win', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={
            'Inline raw HTML:\n\n' +
            '<table style="width:100%;border-collapse:collapse;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)">' +
            '<thead><tr style="background:#1a1a2e;color:#fff"><th style="padding:12px 16px;background:#16213e">React</th></tr></thead>' +
            '<tbody><tr style="background:#fafafa"><td style="color:#2e7d32;font-weight:600">Ready</td></tr></tbody>' +
            '</table>'
          }
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const table = renderer.container.querySelector('table');
    const tableWrapper = renderer.container.querySelector('[data-rich-html-table-container="true"]');

    expect(table).not.toBeNull();
    expect(table?.className).toContain('rich-html-table');
    expect(table?.className).not.toContain('w-max');
    expect(tableWrapper).not.toBeNull();
  });

  it('keeps markdown tables on the standard table styling path', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={'| Name | Total |\n|---|---:|\n| Alice | 42 |'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const table = renderer.container.querySelector('table');

    expect(table).not.toBeNull();
    expect(table?.className).not.toContain('rich-html-table');
    expect(table?.className).toContain('w-max');
  });

  it('strips raw html positioning attributes that can escape the markdown surface', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={
            'Inline raw HTML:\n\n<section id="danger-zone" class="fixed inset-0 z-[9999]" style="position:fixed;inset:0">Safe text</section>'
          }
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const section = renderer.container.querySelector('section');

    expect(section).not.toBeNull();
    expect(section?.getAttribute('id')).toBeNull();
    expect(section?.getAttribute('class') ?? '').not.toContain('fixed');
    expect(section?.getAttribute('class') ?? '').not.toContain('z-[9999]');
    expect(section?.getAttribute('style')).toBeNull();
    expect(section?.textContent).toBe('Safe text');
  });

  it('keeps escaped dollar delimiters literal in prose', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={'Price is \\$5\\$ today.'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('Price is $5$ today.');
    expect(renderer.container.textContent).not.toContain('Price is (5) today.');
  });

  it('keeps thinking tags literal inside inline code examples', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={'示例：`<thinking>secret</thinking>`'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
          hideThinkingInContext
        />,
      );
    });

    const code = renderer.container.querySelector('code');

    expect(code?.textContent).toBe('<thinking>secret</thinking>');
    expect(renderer.container.querySelector('details')).toBeNull();
  });

  it('keeps thinking tags literal inside fenced code blocks', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={'```html\n<thinking>secret</thinking>\n```'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
          hideThinkingInContext
        />,
      );
    });

    expect(renderer.container.querySelector('details')).toBeNull();
    expect(renderer.container.textContent).toContain('<thinking>secret</thinking>');
  });

  it('keeps all raw html pre children when html is allowed', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={'<pre><span>alpha</span>beta</pre>'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('alpha');
    expect(renderer.container.textContent).toContain('beta');
  });

  it('renders standalone multiline raw html fragments without accidental code blocks', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={`<div style="padding:24px;background:#f8f9fa">
  <section style="background:white">
    <p>Transformer summary</p>
  </section>

  <!-- 三大核心特性 -->
  <div style="display:grid">
    <strong>Self-Attention</strong>
  </div>
</div>`}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframe = renderer.container.querySelector('iframe[title="HTML Preview"]');

    expect(renderer.container.querySelector('[data-live-artifact-frame="true"]')).not.toBeNull();
    expect(renderer.container.querySelector('pre')).toBeNull();
    expect(iframe?.getAttribute('srcdoc')).toContain('Self-Attention');
    expect(renderer.container.querySelector('div[style*="display"] strong')).toBeNull();
  });

  it('keeps streaming raw html fragments out of accidental code blocks before they close', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={`<div style="padding:24px;background:#f8f9fa">
    <section style="background:white">
        <p>Transformer summary</p>
    </section>

    <!-- 三大核心特性 -->
    <div style="display:grid">
        <strong>Self-Attention</strong>`}
          isLoading={true}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('pre')).toBeNull();
    expect(renderer.container.textContent).toContain('Self-Attention');
  });

  it('hides markdown preview affordances when interactive mode is disabled', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={'```html\n<html><body>Hello</body></html>\n```'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
          interactiveMode="disabled"
        />,
      );
    });

    expect(renderer.container.querySelector('[title="Open in Side Panel"]')).toBeNull();
    expect(renderer.container.querySelector('[title="code_fullscreen_monitor"]')).toBeNull();
    expect(renderer.container.querySelector('[title="code_fullscreen_modal"]')).toBeNull();
  });

  it('keeps explicit html code blocks in code block chrome instead of artifact frames', () => {
    const document = '<!DOCTYPE html><html><head><title>Demo Artifact</title></head><body><main>Hello</main></body></html>';

    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={`\`\`\`html\n${document}\n\`\`\``}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframe = renderer.container.querySelector('iframe[title="HTML Preview"]');

    expect(renderer.container.querySelector('[data-live-artifact-frame="true"]')).toBeNull();
    expect(iframe).toBeNull();
    expect(renderer.container.querySelector('pre')).not.toBeNull();
    expect(renderer.container.querySelector('[data-code-header-toolbar]')).not.toBeNull();
    expect(renderer.container.textContent).toContain('Demo Artifact');
  });

  it('renders standalone raw html fragments inside artifact frames instead of the message dom', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={'<section style="display:grid"><strong>Inline Artifact</strong></section>'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframe = renderer.container.querySelector('iframe[title="HTML Preview"]');

    expect(renderer.container.querySelector('[data-live-artifact-frame="true"]')).not.toBeNull();
    expect(iframe?.getAttribute('srcdoc')).toContain('Inline Artifact');
    expect(renderer.container.querySelector('section[style*="display"]')).toBeNull();
    expect(renderer.container.querySelector('pre')).toBeNull();
  });

  it('resizes artifact frames from the iframe bridge height message without capping into internal scroll', () => {
    const document = '<!DOCTYPE html><html><body><main style="height:512px">Tall</main></body></html>';

    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={document}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframe = renderer.container.querySelector<HTMLIFrameElement>('iframe[title="HTML Preview"]');
    const viewport = renderer.container.querySelector<HTMLElement>('[data-live-artifact-viewport="true"]');

    expect(iframe).not.toBeNull();
    expect(viewport).not.toBeNull();

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { channel: 'amc-webui-html-preview', event: 'resize', height: 960 },
          source: iframe?.contentWindow,
        }),
      );
    });

    expect(viewport?.style.height).toBe('960px');
    expect(iframe?.getAttribute('scrolling')).toBe('no');
  });

  it('preserves measured artifact height when the same message remounts during list scrolling', () => {
    const document = '<!DOCTYPE html><html><body><main style="height:960px">Stable</main></body></html>';
    const renderArtifact = () => (
      <BaseMarkdownRendererEntry
        content={document}
        messageId="artifact-message-1"
        isLoading={false}
        onImageClick={vi.fn()}
        onOpenHtmlPreview={vi.fn()}
        expandCodeBlocksByDefault={false}
        isMermaidRenderingEnabled={false}
        isGraphvizRenderingEnabled={false}
        themeId="pearl"
        onOpenSidePanel={vi.fn()}
      />
    );

    act(() => {
      renderer.root.render(renderArtifact());
    });

    const iframe = renderer.container.querySelector<HTMLIFrameElement>('iframe[title="HTML Preview"]');

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { channel: 'amc-webui-html-preview', event: 'resize', height: 960 },
          source: iframe?.contentWindow,
        }),
      );
    });

    expect(renderer.container.querySelector<HTMLElement>('[data-live-artifact-viewport="true"]')?.style.height).toBe(
      '960px',
    );

    act(() => {
      renderer.root.unmount();
    });

    act(() => {
      renderer.root.render(renderArtifact());
    });

    expect(renderer.container.querySelector<HTMLElement>('[data-live-artifact-viewport="true"]')?.style.height).toBe(
      '960px',
    );
  });

  it('resets artifact frame height when the html content changes in place', () => {
    const firstDocument = '<!DOCTYPE html><html><body><main>First</main></body></html>';
    const secondDocument = '<!DOCTYPE html><html><body><main>Second</main></body></html>';
    const renderArtifact = (document: string) => (
      <BaseMarkdownRendererEntry
        content={document}
        isLoading={false}
        onImageClick={vi.fn()}
        onOpenHtmlPreview={vi.fn()}
        expandCodeBlocksByDefault={false}
        isMermaidRenderingEnabled={false}
        isGraphvizRenderingEnabled={false}
        themeId="pearl"
        onOpenSidePanel={vi.fn()}
      />
    );

    act(() => {
      renderer.root.render(renderArtifact(firstDocument));
    });

    const iframe = renderer.container.querySelector<HTMLIFrameElement>('iframe[title="HTML Preview"]');

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { channel: 'amc-webui-html-preview', event: 'resize', height: 960 },
          source: iframe?.contentWindow,
        }),
      );
    });

    expect(renderer.container.querySelector<HTMLElement>('[data-live-artifact-viewport="true"]')?.style.height).toBe(
      '960px',
    );

    act(() => {
      renderer.root.render(renderArtifact(secondDocument));
    });

    expect(renderer.container.querySelector<HTMLElement>('[data-live-artifact-viewport="true"]')?.style.height).toBe(
      '320px',
    );
  });

  it('does not make markdown images clickable when interactive mode is disabled', () => {
    const handleImageClick = vi.fn();

    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content="![Diagram](data:image/png;base64,ZmFrZQ==)"
          isLoading={false}
          onImageClick={handleImageClick}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
          interactiveMode="disabled"
        />,
      );
    });

    const image = renderer.container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image?.className).not.toContain('cursor-pointer');

    act(() => {
      image?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleImageClick).not.toHaveBeenCalled();
  });
});
