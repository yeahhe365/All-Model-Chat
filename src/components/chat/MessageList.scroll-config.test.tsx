import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/types';
import { createChatAreaProviderValue, renderWithChatAreaProviders } from '@/test/chatAreaFixtures';
import { MessageList } from './MessageList';
import type { VirtuosoMockProps } from '@/test/messageListTestDoubles';

const virtuosoPropsSpy = vi.hoisted(() => vi.fn());

vi.mock('react-virtuoso', async () => {
  const { createVirtuosoMock } = await import('@/test/messageListTestDoubles');

  return createVirtuosoMock<ChatMessage>(virtuosoPropsSpy);
});

vi.mock('@/components/message/Message', async () => {
  const { createMessageRowMock } = await import('@/test/messageListTestDoubles');

  return createMessageRowMock();
});

vi.mock('@/components/modals/FileConfigurationModal', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('FileConfigurationModal');
});

vi.mock('@/hooks/useMessageListUI', async () => {
  const { createMessageListUIMock } = await import('@/test/messageListTestDoubles');

  return createMessageListUIMock();
});

vi.mock('./message-list/hooks/useMessageListScroll', async () => {
  const { createMessageListScrollMock } = await import('@/test/messageListTestDoubles');

  return createMessageListScrollMock({ scrollerRef: null });
});

vi.mock('./message-list/ScrollNavigation', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('ScrollNavigation');
});

vi.mock('./message-list/TextSelectionToolbar', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('TextSelectionToolbar');
});

vi.mock('./message-list/MessageListFooter', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('MessageListFooter');
});

vi.mock('./message-list/WelcomeScreen', async () => {
  const { createNullComponentMock } = await import('@/test/messageListTestDoubles');

  return createNullComponentMock('WelcomeScreen');
});

const messages: ChatMessage[] = [
  {
    id: 'message-1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date('2026-04-10T00:00:00.000Z'),
  },
];

const createProviderValue = () =>
  createChatAreaProviderValue({
    messageList: {
      messages,
      sessionTitle: 'Test',
      currentModelId: 'gemini-2.5-flash',
    },
  });

describe('MessageList scroll configuration', () => {
  let unmount: (() => void) | null;

  beforeEach(() => {
    virtuosoPropsSpy.mockClear();
    unmount = null;
  });

  afterEach(() => {
    unmount?.();
    vi.clearAllMocks();
  });

  it('configures Virtuoso to pre-render around the viewport and use stable message keys', () => {
    ({ unmount } = renderWithChatAreaProviders(<MessageList />, { value: createProviderValue() }));

    expect(virtuosoPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        increaseViewportBy: { bottom: 800, top: 800 },
        atBottomThreshold: 150,
        computeItemKey: expect.any(Function),
        followOutput: expect.any(Function),
      }),
    );

    const props = virtuosoPropsSpy.mock.calls[0]?.[0] as VirtuosoMockProps<ChatMessage> & {
      className?: string;
      followOutput?: (isAtBottom: boolean) => false | 'auto';
    };
    expect(props.computeItemKey?.(0, messages[0])).toBe('message-1');
    expect(props.followOutput?.(true)).toBe('auto');
    expect(props.followOutput?.(false)).toBe(false);
    expect(props.className).toContain('chat-message-list-scroller');
  });
});
