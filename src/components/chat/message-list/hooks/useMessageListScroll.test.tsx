import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageListScroll } from './useMessageListScroll';
import type { ChatMessage } from '../../../../types';

const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'one', timestamp: new Date() },
  { id: '2', role: 'model', content: 'two', timestamp: new Date() },
  { id: '3', role: 'user', content: 'three', timestamp: new Date() },
];

describe('useMessageListScroll', () => {
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
  });

  it('updates the upward navigation visibility when the visible range changes', () => {
    const Harness = () => {
      const { showScrollUp, onRangeChanged } = useMessageListScroll({
        messages,
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-1',
      });

      return (
        <div>
          <div data-testid="show-scroll-up">{String(showScrollUp)}</div>
          <button type="button" onClick={() => onRangeChanged({ startIndex: 2, endIndex: 2 })}>
            move-down
          </button>
          <button type="button" onClick={() => onRangeChanged({ startIndex: 0, endIndex: 1 })}>
            move-top
          </button>
        </div>
      );
    };

    act(() => {
      root.render(<Harness />);
    });

    const readValue = () => container.querySelector('[data-testid="show-scroll-up"]')?.textContent;
    const [moveDown, moveTop] = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];

    expect(readValue()).toBe('false');

    act(() => {
      moveDown.click();
    });
    expect(readValue()).toBe('true');

    act(() => {
      moveTop.click();
    });
    expect(readValue()).toBe('false');
  });
});
