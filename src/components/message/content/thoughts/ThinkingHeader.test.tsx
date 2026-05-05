import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it } from 'vitest';
import { ThinkingHeader } from './ThinkingHeader';

describe('ThinkingHeader', () => {
  const renderer = setupTestRenderer();

  it('renders the loading spinner without accent background chrome', async () => {
    await act(async () => {
      renderer.root.render(<ThinkingHeader isLoading lastThought={null} isExpanded={false} />);
    });

    const spinnerWrapper = renderer.container.querySelector('svg')?.parentElement;

    expect(spinnerWrapper).not.toBeNull();
    expect(spinnerWrapper?.className).not.toContain('rounded-lg');
    expect(spinnerWrapper?.className).not.toContain('bg-[var(--theme-bg-accent)]/10');
  });
});
