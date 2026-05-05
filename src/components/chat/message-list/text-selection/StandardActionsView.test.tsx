import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../../../stores/settingsStore';
import { StandardActionsView } from './StandardActionsView';

describe('StandardActionsView', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('renders localized Chinese action labels', () => {
    useSettingsStore.setState({ language: 'zh' });

    act(() => {
      root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
        />,
      );
    });

    expect(container.textContent).toContain('引用');
    expect(container.textContent).toContain('插入');
    expect(container.textContent).toContain('复制');
    expect(container.textContent).toContain('搜索');
  });

  it('renders Insert instead of Input in English', () => {
    useSettingsStore.setState({ language: 'en' });

    act(() => {
      root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
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
    useSettingsStore.setState({ language: 'en' });

    act(() => {
      root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
        />,
      );
    });

    const quoteButton = container.querySelector('button[aria-label="Quote"]');
    expect(quoteButton?.className).not.toContain('scale');
  });
});
