import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { ScrollNavigation } from './ScrollNavigation';

describe('ScrollNavigation', () => {
  const renderer = setupTestRenderer();

  it('uses labels that match turn-based navigation behavior', () => {
    act(() => {
      renderer.root.render(
        <ScrollNavigation showUp showDown onScrollToPrev={vi.fn()} onScrollToNext={vi.fn()} bottomOffset={0} />,
      );
    });

    expect(document.querySelector('[aria-label="Scroll to previous turn"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Scroll to next turn or bottom"]')).toBeInTheDocument();
  });
});
