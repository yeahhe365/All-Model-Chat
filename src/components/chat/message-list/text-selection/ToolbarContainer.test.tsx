import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolbarContainer } from './ToolbarContainer';

describe('ToolbarContainer', () => {
  const renderer = setupTestRenderer();
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this instanceof HTMLDivElement && this.textContent?.includes('Quote')) {
        return {
          x: 0,
          y: 0,
          width: 121,
          height: 40,
          top: 0,
          left: 0,
          right: 121,
          bottom: 40,
          toJSON: () => ({}),
        } as DOMRect;
      }

      return originalGetBoundingClientRect.call(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders on whole pixels without transform-based centering or zoom animation', () => {
    act(() => {
      renderer.root.render(
        <ToolbarContainer position={{ top: 40.4, left: 100.2 }} isDragging={false}>
          <button type="button">Quote</button>
        </ToolbarContainer>,
      );
    });

    const quoteButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Quote',
    );
    const toolbar = quoteButton?.parentElement as HTMLDivElement | null;

    expect(toolbar).not.toBeNull();
    expect(toolbar?.style.left).toBe('40px');
    expect(toolbar?.style.top).toBe('40px');
    expect(toolbar?.style.translate).toBe('');
    expect(toolbar?.className).not.toContain('zoom-in');
  });
});
