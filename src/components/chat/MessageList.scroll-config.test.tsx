import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../types';
import { createChatAreaProviderValue, renderWithChatAreaProviders } from '../../test/chatAreaFixtures';
import { MessageList } from './MessageList';

const virtuosoPropsSpy = vi.fn();

interface VirtuosoMockProps<T> {
  data: T[];
  itemContent: (index: number, item: T) => ReactNode;
  computeItemKey?: (index: number, item: T) => React.Key;
}

vi.mock('react-virtuoso', async () => {
  const { forwardRef: reactForwardRef } = await import('react');

  return {
    Virtuoso: reactForwardRef<HTMLDivElement, VirtuosoMockProps<ChatMessage> & Record<string, unknown>>(
      (props, ref) => {
        const typedProps = props as VirtuosoMockProps<ChatMessage> & Record<string, unknown>;

        virtuosoPropsSpy(typedProps);

        return (
          <div ref={ref} data-testid="virtuoso">
            {typedProps.data.map((item: ChatMessage, index: number) => (
              <div key={item.id}>{typedProps.itemContent(index, item)}</div>
            ))}
          </div>
        );
      },
    ),
  };
});

vi.mock('../message/Message', () => ({
  Message: () => <div data-testid="message-row" />,
}));

vi.mock('../modals/FileConfigurationModal', () => ({
  FileConfigurationModal: () => null,
}));

vi.mock('../../hooks/useMessageListUI', () => ({
  useMessageListUI: () => ({
    previewFile: null,
    isHtmlPreviewModalOpen: false,
    htmlToPreview: null,
    initialTrueFullscreenRequest: false,
    configuringFile: null,
    setConfiguringFile: () => {},
    handleFileClick: () => {},
    closeFilePreviewModal: () => {},
    allImages: [],
    currentImageIndex: -1,
    handlePrevImage: () => {},
    handleNextImage: () => {},
    handleOpenHtmlPreview: () => {},
    handleCloseHtmlPreview: () => {},
    handleConfigureFile: () => {},
    handleSaveFileConfig: () => {},
  }),
}));

vi.mock('./message-list/hooks/useMessageListScroll', () => ({
  useMessageListScroll: () => ({
    virtuosoRef: { current: null },
    handleScrollerRef: () => {},
    handleScroll: () => {},
    setAtBottom: () => {},
    onRangeChanged: () => {},
    scrollToPrevTurn: () => {},
    scrollToNextTurn: () => {},
    showScrollDown: false,
    showScrollUp: false,
    scrollerRef: null,
  }),
}));

vi.mock('./message-list/ScrollNavigation', () => ({
  ScrollNavigation: () => null,
}));

vi.mock('./message-list/TextSelectionToolbar', () => ({
  TextSelectionToolbar: () => null,
}));

vi.mock('./message-list/MessageListFooter', () => ({
  MessageListFooter: () => null,
}));

vi.mock('./message-list/WelcomeScreen', () => ({
  WelcomeScreen: () => null,
}));

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

  it('configures Virtuoso to pre-render below the viewport and use stable message keys', () => {
    ({ unmount } = renderWithChatAreaProviders(<MessageList />, { value: createProviderValue() }));

    expect(virtuosoPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        increaseViewportBy: { bottom: 800, top: 0 },
        atBottomThreshold: 150,
        computeItemKey: expect.any(Function),
      }),
    );

    const props = virtuosoPropsSpy.mock.calls[0]?.[0] as VirtuosoMockProps<ChatMessage>;
    expect(props.computeItemKey?.(0, messages[0])).toBe('message-1');
  });
});
