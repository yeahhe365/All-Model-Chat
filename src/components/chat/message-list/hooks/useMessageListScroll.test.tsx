import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from '../../../../types';
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

  it('syncs the scroller element, persists scroll position, and respects bottom-state updates', () => {
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
    expect(localStorage.getItem('chat_scroll_pos_session-1')).toBe('220');
    expect(result.current.showScrollDown).toBe(true);

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

  it('restores saved scroll position for the active session', () => {
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

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 144 });

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

  it('navigates between user turns based on the visible range', () => {
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
      result.current.scrollToNextTurn();
    });

    expect(scrollToIndex).toHaveBeenNthCalledWith(1, {
      index: 0,
      align: 'start',
      behavior: 'smooth',
    });
    expect(scrollToIndex).toHaveBeenNthCalledWith(2, {
      index: 3,
      align: 'end',
      behavior: 'smooth',
    });

    unmount();
  });
});
