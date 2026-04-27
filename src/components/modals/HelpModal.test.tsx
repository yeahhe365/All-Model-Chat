import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelpModal } from './HelpModal';

vi.mock('../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copyToClipboard: vi.fn(),
  }),
}));

describe('HelpModal', () => {
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
    document.body.innerHTML = '';
  });

  it('localizes the search, copy, and empty-state text', async () => {
    const t = (key: string) => key;

    await act(async () => {
      root.render(<HelpModal isOpen onClose={vi.fn()} commands={[]} t={t as any} />);
    });

    const searchInput = document.querySelector('input');
    expect(searchInput?.getAttribute('placeholder')).toBe('helpModal_search_placeholder');
    expect(document.body.textContent).toContain('helpModal_no_results');
    expect(document.body.textContent).toContain('helpModal_tip');
  });

  it('adds visible keyboard focus styles to close and copy actions', async () => {
    const t = (key: string) => key;

    await act(async () => {
      root.render(
        <HelpModal
          isOpen
          onClose={vi.fn()}
          commands={[{ name: '/canvas', description: 'Toggle canvas', icon: 'canvas' } as any]}
          t={t as any}
        />,
      );
    });

    const closeButton = document.body.querySelector('button[aria-label="helpModal_close_aria"]');
    const copyButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('/canvas'),
    );

    expect(closeButton?.className).toContain('focus-visible:ring-2');
    expect(copyButton?.className).toContain('focus-visible:ring-2');
  });
});
