import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollNavigation } from './ScrollNavigation';

describe('ScrollNavigation', () => {
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('uses labels that match turn-based navigation behavior', () => {
    act(() => {
      root.render(
        <ScrollNavigation showUp showDown onScrollToPrev={vi.fn()} onScrollToNext={vi.fn()} bottomOffset={0} />,
      );
    });

    expect(document.querySelector('[aria-label="Scroll to previous turn"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Scroll to next turn or bottom"]')).toBeInTheDocument();
  });
});
