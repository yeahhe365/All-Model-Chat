import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScrollNavigation } from './ScrollNavigation';

describe('ScrollNavigation', () => {
  const renderer = setupTestRenderer();

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses labels that match turn-based navigation behavior', () => {
    act(() => {
      renderer.root.render(
        <ScrollNavigation
          showUp
          showDown
          onScrollToPrev={vi.fn()}
          onScrollToNext={vi.fn()}
          onScrollToTop={vi.fn()}
          onScrollToBottom={vi.fn()}
          bottomOffset={0}
        />,
      );
    });

    expect(document.querySelector('[aria-label="Scroll to previous turn"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Scroll to next turn"]')).toBeInTheDocument();
  });

  it('keeps single click navigation distinct from double click top and bottom jumps', () => {
    vi.useFakeTimers();
    const onScrollToPrev = vi.fn();
    const onScrollToNext = vi.fn();
    const onScrollToTop = vi.fn();
    const onScrollToBottom = vi.fn();

    act(() => {
      renderer.root.render(
        <ScrollNavigation
          showUp
          showDown
          onScrollToPrev={onScrollToPrev}
          onScrollToNext={onScrollToNext}
          onScrollToTop={onScrollToTop}
          onScrollToBottom={onScrollToBottom}
          bottomOffset={0}
        />,
      );
    });

    const prevButton = document.querySelector<HTMLButtonElement>('[aria-label="Scroll to previous turn"]');
    const nextButton = document.querySelector<HTMLButtonElement>('[aria-label="Scroll to next turn"]');

    act(() => {
      prevButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      vi.advanceTimersByTime(220);
    });

    expect(onScrollToPrev).toHaveBeenCalledTimes(1);
    expect(onScrollToNext).toHaveBeenCalledTimes(1);

    act(() => {
      prevButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      prevButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
      prevButton?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }));
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
      nextButton?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }));
      vi.advanceTimersByTime(220);
    });

    expect(onScrollToPrev).toHaveBeenCalledTimes(1);
    expect(onScrollToNext).toHaveBeenCalledTimes(1);
    expect(onScrollToTop).toHaveBeenCalledTimes(1);
    expect(onScrollToBottom).toHaveBeenCalledTimes(1);
  });
});
