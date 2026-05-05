import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThinkingHeader } from './ThinkingHeader';

describe('ThinkingHeader', () => {
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

  it('renders the loading spinner without accent background chrome', async () => {
    await act(async () => {
      root.render(<ThinkingHeader isLoading lastThought={null} isExpanded={false} />);
    });

    const spinnerWrapper = container.querySelector('svg')?.parentElement;

    expect(spinnerWrapper).not.toBeNull();
    expect(spinnerWrapper?.className).not.toContain('rounded-lg');
    expect(spinnerWrapper?.className).not.toContain('bg-[var(--theme-bg-accent)]/10');
  });
});
