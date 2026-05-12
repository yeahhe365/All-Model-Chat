import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { StandardActionsView } from './StandardActionsView';

describe('StandardActionsView', () => {
  const renderer = setupTestRenderer();

  it('renders localized Chinese action labels', () => {
    useSettingsStore.setState({ language: 'zh' });

    act(() => {
      renderer.root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('引用');
    expect(renderer.container.textContent).toContain('插入');
    expect(renderer.container.textContent).toContain('复制');
    expect(renderer.container.textContent).toContain('搜索');
  });

  it('renders Insert instead of Input in English', () => {
    useSettingsStore.setState({ language: 'en' });

    act(() => {
      renderer.root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('Quote');
    expect(renderer.container.textContent).toContain('Insert');
    expect(renderer.container.textContent).toContain('Copy');
    expect(renderer.container.textContent).toContain('Search');
    expect(renderer.container.textContent).not.toContain('Input');
  });

  it('keeps selection action buttons free of scale transforms', () => {
    useSettingsStore.setState({ language: 'en' });

    act(() => {
      renderer.root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
        />,
      );
    });

    const quoteButton = renderer.container.querySelector('button[aria-label="Quote"]');
    expect(quoteButton?.className).not.toContain('scale');
  });
});
