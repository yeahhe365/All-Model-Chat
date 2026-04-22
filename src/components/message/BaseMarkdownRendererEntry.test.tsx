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
          t={(key) => key}
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
          t={(key) => key}
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
          content={'<table><caption>Monthly totals</caption><thead><tr><th>Name</th><th>Total</th></tr></thead><tbody><tr><td>Alice</td><td>42</td></tr></tbody></table>'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          allowHtml
          t={(key) => key}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const caption = container.querySelector('caption');

    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe('Monthly totals');
  });
});
