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
            '<table><caption>Monthly totals</caption><thead><tr><th>Name</th><th>Total</th></tr></thead><tbody><tr><td>Alice</td><td>42</td></tr></tbody></table>'
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

  it('strips raw html positioning attributes that can escape the markdown surface', () => {
    act(() => {
      renderer.root.render(
        <BaseMarkdownRendererEntry
          content={
            '<section id="danger-zone" class="fixed inset-0 z-[9999]" style="position:fixed;inset:0">Safe text</section>'
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
