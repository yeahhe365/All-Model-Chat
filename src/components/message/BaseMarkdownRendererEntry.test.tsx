import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseMarkdownRendererEntry } from './BaseMarkdownRendererEntry';

describe('BaseMarkdownRendererEntry', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders bold text when quoted emphasis is adjacent to surrounding CJK text', () => {
    act(() => {
      root.render(
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

    const strong = container.querySelector('strong');

    expect(container.textContent).toBe('遇到的“不定式”问题。');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('“不定式”');
  });

  it('renders bold text when wrapped quotes are followed by additional CJK text inside emphasis', () => {
    act(() => {
      root.render(
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

    const strong = container.querySelector('strong');

    expect(container.textContent).toBe('这句话听起来像是一个“反差萌”的幽默表达');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('“反差萌”的幽默表达');
  });

  it('renders bold title text that ends with punctuation before adjacent content', () => {
    act(() => {
      root.render(
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

    const strong = container.querySelector('strong');

    expect(container.textContent).toBe('背景：这是说明。');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('背景：');
  });

  it('renders wrapped and title-style fallback bold text in the same paragraph', () => {
    act(() => {
      root.render(
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

    const strongTexts = Array.from(container.querySelectorAll('strong')).map((strong) => strong.textContent);

    expect(container.textContent).toBe('先看“不定式”，再看背景：这是说明。');
    expect(strongTexts).toEqual(['“不定式”', '背景：']);
  });

  it('renders underscored bold text adjacent to CJK text', () => {
    act(() => {
      root.render(
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

    const strong = container.querySelector('strong');

    expect(container.textContent).toBe('这是重点内容。');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('重点');
  });

  it('keeps underscore markers literal inside ASCII identifiers', () => {
    act(() => {
      root.render(
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

    expect(container.textContent).toBe('Keep foo__bar__baz literal.');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('keeps quoted emphasis markers literal inside inline code', () => {
    act(() => {
      root.render(
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

    const code = container.querySelector('code');

    expect(code?.textContent).toBe('遇到的**“不定式”**问题。');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('preserves html table captions when raw html is allowed', () => {
    act(() => {
      root.render(
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

    const caption = container.querySelector('caption');

    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe('Monthly totals');
  });

  it('renders generated files inside sanitized tool result blocks', () => {
    act(() => {
      root.render(
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

    const generatedOutputLabel = container.textContent || '';
    const image = container.querySelector('img');

    expect(generatedOutputLabel).toContain('Generated Output Files');
    expect(image?.getAttribute('src')).toBe('blob:generated-plot');
  });

  it('strips raw html positioning attributes that can escape the markdown surface', () => {
    act(() => {
      root.render(
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

    const section = container.querySelector('section');

    expect(section).not.toBeNull();
    expect(section?.getAttribute('id')).toBeNull();
    expect(section?.getAttribute('class') ?? '').not.toContain('fixed');
    expect(section?.getAttribute('class') ?? '').not.toContain('z-[9999]');
    expect(section?.getAttribute('style')).toBeNull();
    expect(section?.textContent).toBe('Safe text');
  });

  it('keeps escaped dollar delimiters literal in prose', () => {
    act(() => {
      root.render(
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

    expect(container.textContent).toContain('Price is $5$ today.');
    expect(container.textContent).not.toContain('Price is (5) today.');
  });

  it('keeps thinking tags literal inside inline code examples', () => {
    act(() => {
      root.render(
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

    const code = container.querySelector('code');

    expect(code?.textContent).toBe('<thinking>secret</thinking>');
    expect(container.querySelector('details')).toBeNull();
  });

  it('keeps thinking tags literal inside fenced code blocks', () => {
    act(() => {
      root.render(
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

    expect(container.querySelector('details')).toBeNull();
    expect(container.textContent).toContain('<thinking>secret</thinking>');
  });

  it('keeps all raw html pre children when html is allowed', () => {
    act(() => {
      root.render(
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

    expect(container.textContent).toContain('alpha');
    expect(container.textContent).toContain('beta');
  });

  it('hides markdown preview affordances when interactive mode is disabled', () => {
    act(() => {
      root.render(
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

    expect(container.querySelector('[title="Open in Side Panel"]')).toBeNull();
    expect(container.querySelector('[title="code_fullscreen_monitor"]')).toBeNull();
    expect(container.querySelector('[title="code_fullscreen_modal"]')).toBeNull();
  });

  it('does not make markdown images clickable when interactive mode is disabled', () => {
    const handleImageClick = vi.fn();

    act(() => {
      root.render(
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

    const image = container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image?.className).not.toContain('cursor-pointer');

    act(() => {
      image?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleImageClick).not.toHaveBeenCalled();
  });
});
