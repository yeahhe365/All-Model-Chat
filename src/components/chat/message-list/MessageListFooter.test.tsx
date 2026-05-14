import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/types';
import { setupTestRenderer } from '@/test/testUtils';
import { MessageListFooter } from './MessageListFooter';

const createModelMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-model',
  role: 'model',
  content: 'Answer',
  timestamp: new Date('2026-05-08T00:00:00.000Z'),
  ...overrides,
});

describe('MessageListFooter', () => {
  const renderer = setupTestRenderer();

  it('keeps the spacer height instantaneous so bottom-edge scroll does not animate', () => {
    renderer.render(<MessageListFooter messages={[createModelMessage({ isLoading: true })]} chatInputHeight={144} />);

    const spacer = renderer.container.firstElementChild as HTMLDivElement | null;

    expect(spacer?.style.height).toBe('85vh');
    expect(spacer?.style.transition).toBe('');
    expect(spacer?.style.overflowAnchor).toBe('none');
  });

  it('rounds the spacer up to a stable whole pixel when the input height is fractional', () => {
    renderer.render(<MessageListFooter messages={[createModelMessage()]} chatInputHeight={160.8} />);

    const spacer = renderer.container.firstElementChild as HTMLDivElement | null;

    expect(spacer?.style.height).toBe('181px');
  });
});
