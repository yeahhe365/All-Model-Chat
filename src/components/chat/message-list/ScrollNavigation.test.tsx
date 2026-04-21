import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollNavigation } from './ScrollNavigation';

describe('ScrollNavigation', () => {
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

  it('uses labels that match turn-based navigation behavior', () => {
    act(() => {
      root.render(
        <ScrollNavigation
          showUp
          showDown
          onScrollToPrev={vi.fn()}
          onScrollToNext={vi.fn()}
          bottomOffset={0}
        />,
      );
    });

    expect(document.querySelector('[aria-label="Scroll to previous turn"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Scroll to next turn or bottom"]')).toBeInTheDocument();
  });
});
