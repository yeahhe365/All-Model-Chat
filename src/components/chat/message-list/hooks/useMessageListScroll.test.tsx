import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from '@/types';
import { useMessageListScroll } from './useMessageListScroll';
import { renderHook } from '@/test/testUtils';

const createMessages = (): ChatMessage[] => [
  {
    id: 'message-1',
    role: 'user',
    content: 'First turn',
    timestamp: new Date('2026-04-15T00:00:00.000Z'),
  },
  {
    id: 'message-2',
    role: 'model',
    content: 'First response',
    timestamp: new Date('2026-04-15T00:00:01.000Z'),
  },
  {
    id: 'message-3',
    role: 'user',
    content: 'Second turn',
    timestamp: new Date('2026-04-15T00:00:02.000Z'),
  },
  {
    id: 'message-4',
    role: 'model',
    content: 'Second response',
    timestamp: new Date('2026-04-15T00:00:03.000Z'),
  },
];

const createSingleTurnMessages = (): ChatMessage[] => [
  {
    id: 'message-single-1',
    role: 'user',
    content: 'Only turn',
    timestamp: new Date('2026-04-15T00:00:00.000Z'),
  },
  {
    id: 'message-single-2',
    role: 'model',
    content: 'A very long answer',
    timestamp: new Date('2026-04-15T00:00:01.000Z'),
  },
];

const createThreeTurnMessages = (): ChatMessage[] => [
  ...createMessages(),
  {
    id: 'message-5',
    role: 'user',
    content: 'Third turn',
    timestamp: new Date('2026-04-15T00:00:04.000Z'),
  },
  {
    id: 'message-6',
    role: 'model',
    content: 'Third response',
    timestamp: new Date('2026-04-15T00:00:05.000Z'),
  },
];

const createLongThreadMessages = (count: number): ChatMessage[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `long-message-${index + 1}`,
    role: index % 2 === 0 ? 'user' : 'model',
    content: `Long thread message ${index + 1}`,
    timestamp: new Date(Date.parse('2026-04-15T00:00:00.000Z') + index * 1000),
  }));

const setElementTop = (element: Element, top: number) => {
  element.getBoundingClientRect = vi.fn(() => ({
    top,
    bottom: top + 40,
    left: 0,
    right: 100,
    width: 100,
    height: 40,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }));
};

const readStoredScrollSnapshot = (sessionId: string) => {
  const rawSnapshot = localStorage.getItem(`chat_scroll_pos_${sessionId}`);
  expect(rawSnapshot).not.toBeNull();
  return JSON.parse(rawSnapshot!);
};

describe('useMessageListScroll', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('syncs the scroller element, persists a visible message anchor, and respects bottom-state updates', () => {
    const setScrollContainerRef = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef,
        activeSessionId: 'session-1',
      }),
    );

    const scroller = document.createElement('div');
    Object.defineProperties(scroller, {
      scrollTop: { value: 220, writable: true },
      scrollHeight: { value: 1000, writable: true },
      clientHeight: { value: 200, writable: true },
    });
    setElementTop(scroller, 100);

    const firstRenderedMessage = document.createElement('div');
    firstRenderedMessage.dataset.messageId = 'message-1';
    setElementTop(firstRenderedMessage, 60);
    scroller.appendChild(firstRenderedMessage);

    const visibleRenderedMessage = document.createElement('div');
    visibleRenderedMessage.dataset.messageId = 'message-3';
    setElementTop(visibleRenderedMessage, 116);
    scroller.appendChild(visibleRenderedMessage);

    act(() => {
      result.current.handleScrollerRef(scroller);
      vi.advanceTimersByTime(50);
    });

    act(() => {
      result.current.handleScroll();
      vi.advanceTimersByTime(300);
      result.current.setAtBottom(false);
    });

    expect(setScrollContainerRef).toHaveBeenCalledWith(scroller);
    expect(readStoredScrollSnapshot('session-1')).toEqual({
      messageId: 'message-3',
      scrollTop: 220,
      topOffset: 16,
    });
    expect(result.current.showScrollDown).toBe(true);

    unmount();
  });

  it('persists the scroll snapshot captured before a history session switch', () => {
    let messages = [
      {
        id: 'session-a-message',
        role: 'user' as const,
        content: 'Session A',
        timestamp: new Date('2026-04-15T00:00:00.000Z'),
      },
    ];
    let activeSessionId = 'session-a';
    const { result, rerender, unmount } = renderHook(() =>
      useMessageListScroll({
        messages,
        setScrollContainerRef: vi.fn(),
        activeSessionId,
      }),
    );

    const scroller = document.createElement('div');
    Object.defineProperties(scroller, {
      scrollTop: { value: 220, writable: true },
      scrollHeight: { value: 1000, writable: true },
      clientHeight: { value: 200, writable: true },
    });
    setElementTop(scroller, 100);

    const sessionAMessage = document.createElement('div');
    sessionAMessage.dataset.messageId = 'session-a-message';
    setElementTop(sessionAMessage, 124);
    scroller.appendChild(sessionAMessage);

    act(() => {
      result.current.handleScrollerRef(scroller);
      vi.advanceTimersByTime(50);
    });

    act(() => {
      result.current.handleScroll();
    });

    scroller.replaceChildren();
    const sessionBMessage = document.createElement('div');
    sessionBMessage.dataset.messageId = 'session-b-message';
    setElementTop(sessionBMessage, 180);
    scroller.appendChild(sessionBMessage);

    messages = [
      {
        id: 'session-b-message',
        role: 'user' as const,
        content: 'Session B',
        timestamp: new Date('2026-04-15T00:00:01.000Z'),
      },
    ];
    activeSessionId = 'session-b';

    act(() => {
      rerender();
      vi.advanceTimersByTime(300);
    });

    expect(readStoredScrollSnapshot('session-a')).toEqual({
      messageId: 'session-a-message',
      scrollTop: 220,
      topOffset: 24,
    });

    unmount();
  });

  it('shows the previous-turn control while reading a long single-turn response', () => {
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createSingleTurnMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-single-turn',
      }),
    );

    act(() => {
      result.current.onRangeChanged({ startIndex: 1, endIndex: 1 });
    });

    expect(result.current.showScrollUp).toBe(true);

    unmount();
  });

  it('restores long history sessions to the saved message anchor instead of an approximate scrollTop', () => {
    const longMessages = createLongThreadMessages(120);
    localStorage.setItem(
      'chat_scroll_pos_session-long-restore',
      JSON.stringify({ messageId: 'long-message-91', topOffset: 32, scrollTop: 8400 }),
    );

    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: longMessages,
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-long-restore',
      }),
    );

    const scrollTo = vi.fn();
    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo,
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 90, align: 'start', offset: -32 });

    unmount();
  });

  it('restores saved scroll anchors by message id and relative offset', () => {
    localStorage.setItem(
      'chat_scroll_pos_session-restore',
      JSON.stringify({ messageId: 'message-3', topOffset: 18, scrollTop: 144 }),
    );

    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-restore',
      }),
    );

    const scrollTo = vi.fn();
    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo,
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 2, align: 'start', offset: -18 });

    unmount();
  });

  it('keeps support for legacy numeric scroll restoration entries', () => {
    localStorage.setItem('chat_scroll_pos_session-legacy-restore', '144');

    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-legacy-restore',
      }),
    );

    const scrollTo = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo,
      scrollToIndex: vi.fn(),
    } as unknown as VirtuosoHandle;

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 144 });

    unmount();
  });

  it('falls back to scrollTop when a stored JSON snapshot has no message anchor', () => {
    localStorage.setItem('chat_scroll_pos_session-json-fallback', JSON.stringify({ scrollTop: 188 }));

    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-json-fallback',
      }),
    );

    const scrollTo = vi.fn();
    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo,
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollToIndex).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ top: 188 });

    unmount();
  });

  it('restores new sessions through the footer spacer by default', () => {
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-new',
      }),
    );

    const scrollTo = vi.fn();
    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo,
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 'LAST', align: 'end' });

    unmount();
  });

  it('cancels pending scroll restoration when the hook unmounts', () => {
    localStorage.setItem('chat_scroll_pos_session-restore', '144');

    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-restore',
      }),
    );

    const scrollTo = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo,
      scrollToIndex: vi.fn(),
    } as unknown as VirtuosoHandle;

    unmount();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not let a pending new-turn anchor pull the view upward after jumping to bottom', () => {
    let messages = [createMessages()[0]];
    const { result, rerender, unmount } = renderHook(() =>
      useMessageListScroll({
        messages,
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-bottom-anchor-cancel',
      }),
    );

    const scrollTo = vi.fn();
    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo,
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      vi.advanceTimersByTime(50);
    });

    scrollTo.mockClear();

    messages = [createMessages()[0], createMessages()[1]];

    act(() => {
      rerender();
    });

    act(() => {
      result.current.scrollToBottom();
      vi.advanceTimersByTime(50);
    });

    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollToIndex).toHaveBeenCalledWith({
      index: 'LAST',
      align: 'end',
      behavior: 'smooth',
    });

    unmount();
  });

  it('anchors newly appended model turns in the same restored session', () => {
    let messages = createMessages().slice(0, 2);
    const { result, rerender, unmount } = renderHook(() =>
      useMessageListScroll({
        messages,
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-new-model-turn',
      }),
    );

    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo: vi.fn(),
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      vi.advanceTimersByTime(50);
    });
    scrollToIndex.mockClear();

    messages = [
      ...messages,
      {
        id: 'message-3',
        role: 'user',
        content: 'Second turn',
        timestamp: new Date('2026-04-15T00:00:02.000Z'),
      },
      {
        id: 'message-4',
        role: 'model',
        content: '',
        timestamp: new Date('2026-04-15T00:00:03.000Z'),
      },
    ];

    act(() => {
      rerender();
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollToIndex).toHaveBeenCalledWith({
      index: 3,
      align: 'start',
      behavior: 'smooth',
    });

    unmount();
  });

  it('keeps the current streaming message in place when only its content changes', () => {
    let messages = createMessages();
    const { result, rerender, unmount } = renderHook(() =>
      useMessageListScroll({
        messages,
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-stream-content',
      }),
    );

    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo: vi.fn(),
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      vi.advanceTimersByTime(50);
    });
    scrollToIndex.mockClear();

    messages = messages.map((message) =>
      message.id === 'message-4' ? { ...message, content: `${message.content}\nstreamed token` } : message,
    );

    act(() => {
      rerender();
      vi.advanceTimersByTime(50);
    });

    expect(scrollToIndex).not.toHaveBeenCalled();

    unmount();
  });

  it('does not recalculate bottom-state during scroll handling', () => {
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-bottom-state',
      }),
    );

    const scroller = document.createElement('div');
    Object.defineProperties(scroller, {
      scrollTop: { value: 700, writable: true },
      scrollHeight: { value: 1000, writable: true },
      clientHeight: { value: 200, writable: true },
    });

    act(() => {
      result.current.handleScrollerRef(scroller);
      vi.advanceTimersByTime(50);
      result.current.setAtBottom(false);
    });

    act(() => {
      result.current.handleScroll();
      vi.advanceTimersByTime(300);
    });

    expect(result.current.showScrollDown).toBe(true);

    unmount();
  });

  it('navigates to previous user turns based on the visible range', () => {
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-nav',
      }),
    );

    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo: vi.fn(),
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      result.current.onRangeChanged({ startIndex: 2, endIndex: 3 });
      result.current.scrollToPrevTurn();
    });

    expect(scrollToIndex).toHaveBeenCalledWith({
      index: 0,
      align: 'start',
      behavior: 'smooth',
    });

    unmount();
  });

  it('uses rendered message positions when range start is stale from overscan', () => {
    const messages = createThreeTurnMessages();
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages,
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-nav-dom',
      }),
    );

    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo: vi.fn(),
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    const scroller = document.createElement('div');
    setElementTop(scroller, 0);

    const firstTurn = document.createElement('div');
    firstTurn.dataset.messageId = 'message-1';
    firstTurn.dataset.messageRole = 'user';
    setElementTop(firstTurn, -500);
    scroller.appendChild(firstTurn);

    const secondTurn = document.createElement('div');
    secondTurn.dataset.messageId = 'message-3';
    secondTurn.dataset.messageRole = 'user';
    setElementTop(secondTurn, 24);
    scroller.appendChild(secondTurn);

    const thirdTurn = document.createElement('div');
    thirdTurn.dataset.messageId = 'message-5';
    thirdTurn.dataset.messageRole = 'user';
    setElementTop(thirdTurn, 360);
    scroller.appendChild(thirdTurn);

    act(() => {
      result.current.handleScrollerRef(scroller);
    });

    act(() => {
      result.current.onRangeChanged({ startIndex: 0, endIndex: 5 });
    });

    act(() => {
      result.current.scrollToNextTurn();
    });

    expect(scrollToIndex).toHaveBeenCalledWith({
      index: 4,
      align: 'start',
      behavior: 'smooth',
    });

    unmount();
  });

  it('advances repeated next-turn clicks even before the visible range catches up', () => {
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createThreeTurnMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-repeated-next',
      }),
    );

    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo: vi.fn(),
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      result.current.onRangeChanged({ startIndex: 0, endIndex: 2 });
      result.current.scrollToNextTurn();
      result.current.scrollToNextTurn();
    });

    expect(scrollToIndex).toHaveBeenNthCalledWith(1, {
      index: 2,
      align: 'start',
      behavior: 'smooth',
    });
    expect(scrollToIndex).toHaveBeenNthCalledWith(2, {
      index: 4,
      align: 'start',
      behavior: 'smooth',
    });

    unmount();
  });

  it('does not fall back to scrolling the bottom when there is no next user turn', () => {
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-no-next-turn',
      }),
    );

    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo: vi.fn(),
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      result.current.onRangeChanged({ startIndex: 2, endIndex: 3 });
      result.current.scrollToNextTurn();
    });

    expect(scrollToIndex).not.toHaveBeenCalled();

    unmount();
  });

  it('does not retarget the current rendered turn when stale range has no later turn', () => {
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-stale-no-next-turn',
      }),
    );

    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo: vi.fn(),
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    const scroller = document.createElement('div');
    setElementTop(scroller, 0);

    const firstTurn = document.createElement('div');
    firstTurn.dataset.messageId = 'message-1';
    firstTurn.dataset.messageRole = 'user';
    setElementTop(firstTurn, -500);
    scroller.appendChild(firstTurn);

    const secondTurn = document.createElement('div');
    secondTurn.dataset.messageId = 'message-3';
    secondTurn.dataset.messageRole = 'user';
    setElementTop(secondTurn, 24);
    scroller.appendChild(secondTurn);

    act(() => {
      result.current.handleScrollerRef(scroller);
    });

    act(() => {
      result.current.onRangeChanged({ startIndex: 0, endIndex: 3 });
      result.current.scrollToNextTurn();
    });

    expect(scrollToIndex).not.toHaveBeenCalled();

    unmount();
  });

  it('scrolls directly to top and through the footer spacer for double-click navigation shortcuts', () => {
    const { result, unmount } = renderHook(() =>
      useMessageListScroll({
        messages: createMessages(),
        setScrollContainerRef: vi.fn(),
        activeSessionId: 'session-top-bottom',
      }),
    );

    const scrollTo = vi.fn();
    const scrollToIndex = vi.fn();
    const virtuosoRef = result.current.virtuosoRef as unknown as { current: VirtuosoHandle | null };
    virtuosoRef.current = {
      scrollTo,
      scrollToIndex,
    } as unknown as VirtuosoHandle;

    act(() => {
      result.current.scrollToTop();
      result.current.scrollToBottom();
    });

    expect(scrollToIndex).toHaveBeenNthCalledWith(1, {
      index: 0,
      align: 'start',
      behavior: 'smooth',
    });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollToIndex).toHaveBeenNthCalledWith(2, {
      index: 'LAST',
      align: 'end',
      behavior: 'smooth',
    });

    unmount();
  });
});
