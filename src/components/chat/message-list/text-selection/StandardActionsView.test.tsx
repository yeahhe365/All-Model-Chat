import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranslator } from '../../../../utils/translations';
import { StandardActionsView } from './StandardActionsView';

describe('StandardActionsView', () => {
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

  it('renders localized Chinese action labels', () => {
    const t = getTranslator('zh');

    act(() => {
      root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
          t={t}
        />,
      );
    });

    expect(container.textContent).toContain('引用');
    expect(container.textContent).toContain('插入');
    expect(container.textContent).toContain('复制');
    expect(container.textContent).toContain('搜索');
  });

  it('renders Insert instead of Input in English', () => {
    const t = getTranslator('en');

    act(() => {
      root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
          t={t}
        />,
      );
    });

    expect(container.textContent).toContain('Quote');
    expect(container.textContent).toContain('Insert');
    expect(container.textContent).toContain('Copy');
    expect(container.textContent).toContain('Search');
    expect(container.textContent).not.toContain('Input');
  });

  it('keeps selection action buttons free of scale transforms', () => {
    const t = getTranslator('en');

    act(() => {
      root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
          t={t}
        />,
      );
    });

    const quoteButton = container.querySelector('button[aria-label="Quote"]');
    expect(quoteButton?.className).not.toContain('scale');
  });
});
