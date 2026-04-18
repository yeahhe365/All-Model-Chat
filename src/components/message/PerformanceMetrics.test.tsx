import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PerformanceMetrics } from './PerformanceMetrics';
import type { ChatMessage } from '../../types';

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-1',
  role: 'model',
  content: 'Hello',
  timestamp: new Date('2026-04-17T00:00:00.000Z'),
  promptTokens: 120,
  cachedPromptTokens: 40,
  completionTokens: 80,
  totalTokens: 200,
  generationStartTime: new Date('2026-04-17T00:00:00.000Z'),
  generationEndTime: new Date('2026-04-17T00:00:01.000Z'),
  ...overrides,
});

describe('PerformanceMetrics', () => {
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

  it('shows cached prompt token hits when available', () => {
    act(() => {
      root.render(<PerformanceMetrics message={createMessage()} />);
    });

    expect(container.textContent).toContain('C: 40');
    expect(container.textContent).toContain('U: 80');
    expect(container.textContent).toContain('O: 80');
  });

  it('shows tool-use and thought buckets when available', () => {
    act(() => {
      root.render(
        <PerformanceMetrics
          message={createMessage({
            toolUsePromptTokens: 12,
            thoughtTokens: 7,
            totalTokens: 219,
          })}
        />,
      );
    });

    expect(container.textContent).toContain('T: 12');
    expect(container.textContent).toContain('R: 7');
    expect(container.textContent).not.toContain('Σ: 219');
    expect(container.querySelectorAll('.w-px.h-3').length).toBe(4);
  });
});
