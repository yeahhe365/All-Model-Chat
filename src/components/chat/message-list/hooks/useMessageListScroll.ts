import { useRef, useState, useCallback, useEffect } from 'react';
import { type VirtuosoHandle } from 'react-virtuoso';
import { type ChatMessage } from '@/types';

interface UseMessageListScrollProps {
  messages: ChatMessage[];
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  activeSessionId: string | null;
}

const CURRENT_TURN_VIEWPORT_OFFSET_PX = 96;

export const useMessageListScroll = ({
  messages,
  setScrollContainerRef,
  activeSessionId,
}: UseMessageListScrollProps) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [scrollerRef, setInternalScrollerRef] = useState<HTMLElement | null>(null);
  const visibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });

  const scrollSaveTimeoutRef = useRef<number | null>(null);
  const anchorTimeoutRef = useRef<number | null>(null);
  const restoreTimeoutRef = useRef<number | null>(null);
  const lastRestoredSessionIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef(activeSessionId);

  // Track the last index we programmatically scrolled to
  const lastScrollTarget = useRef<number | null>(null);

  // Track state for the anchoring effect specifically
  const prevMsgCount = useRef(messages.length);
  const prevSessionIdForAnchor = useRef(activeSessionId);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const clearAnchorTimeout = useCallback(() => {
    if (anchorTimeoutRef.current !== null) {
      clearTimeout(anchorTimeoutRef.current);
      anchorTimeoutRef.current = null;
    }
  }, []);

  const clearRestoreTimeout = useCallback(() => {
    if (restoreTimeoutRef.current !== null) {
      clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }
  }, []);

  // Range tracking for navigation
  const onRangeChanged = useCallback(({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
    visibleRangeRef.current = { startIndex, endIndex };
    setVisibleStartIndex(startIndex);
  }, []);

  const handleScrollerRef = useCallback(
    (ref: Window | HTMLElement | null) => {
      if (ref === null || ref instanceof HTMLElement) {
        setInternalScrollerRef(ref);
        setScrollContainerRef(ref as HTMLDivElement | null);
      }
    },
    [setScrollContainerRef],
  );

  // Handle New Turn Anchoring: When a message is sent, scroll the model's message to the top.
  useEffect(() => {
    const sessionChanged = prevSessionIdForAnchor.current !== activeSessionId;
    const restorationPending = lastRestoredSessionIdRef.current !== activeSessionId;

    // GUARD: If session changed OR we are waiting for scroll restoration to complete,
    // we must NOT auto-scroll to bottom. This prevents the "jump to bottom" glitch
    // when loading a history session that has many messages.
    if (sessionChanged || restorationPending) {
      // Update trackers to current state so we don't trigger "new message" logic on the next render
      prevSessionIdForAnchor.current = activeSessionId;
      prevMsgCount.current = messages.length;
      return;
    }

    // Normal Logic: If message count increased within the SAME, STABLE session
    if (messages.length > prevMsgCount.current) {
      // Find the index of the newly added Model message (placeholder)
      let targetIndex = -1;
      // Search backwards starting from the end of the previous message count
      for (let i = messages.length - 1; i >= Math.max(0, prevMsgCount.current - 1); i--) {
        if (messages[i].role === 'model') {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex !== -1) {
        const sessionIdForScroll = activeSessionId;
        clearAnchorTimeout();
        // Anchor view to the top of the model message (start of response)
        // Timeout ensures render cycle is complete including footer height adjustment
        anchorTimeoutRef.current = window.setTimeout(() => {
          anchorTimeoutRef.current = null;
          if (activeSessionIdRef.current !== sessionIdForScroll) return;
          virtuosoRef.current?.scrollToIndex({
            index: targetIndex,
            align: 'start',
            behavior: 'smooth',
          });
          lastScrollTarget.current = targetIndex;
        }, 50);
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages, activeSessionId, clearAnchorTimeout]);

  // Enhanced Navigation Logic: Search data array instead of DOM
  const scrollToPrevTurn = useCallback(() => {
    const currentStartIndex = visibleRangeRef.current.startIndex;
    let targetIndex = -1;

    // Search backwards from currentStartIndex - 1 to find the start of the previous user message
    for (let i = Math.max(0, currentStartIndex - 1); i >= 0; i--) {
      if (messages[i].role === 'user') {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex !== -1) {
      lastScrollTarget.current = targetIndex;
      virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
    } else {
      virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' });
    }
  }, [messages]);

  const scrollToNextTurn = useCallback(() => {
    const renderedTurnNavigation = (() => {
      if (!scrollerRef) {
        return null;
      }

      const messageIndexById = new Map(messages.map((message, index) => [message.id, index]));
      const viewportTop = scrollerRef.getBoundingClientRect().top;
      const currentTurnThreshold = viewportTop + CURRENT_TURN_VIEWPORT_OFFSET_PX;
      const renderedUserTurns = Array.from(
        scrollerRef.querySelectorAll<HTMLElement>('[data-message-role="user"][data-message-id]'),
      );

      let currentUserTurnIndex: number | null = null;
      let nextUserTurnIndex: number | null = null;

      for (const userTurnElement of renderedUserTurns) {
        const messageId = userTurnElement.dataset.messageId;
        if (!messageId) continue;

        const messageIndex = messageIndexById.get(messageId);
        if (messageIndex === undefined) continue;

        if (userTurnElement.getBoundingClientRect().top <= currentTurnThreshold) {
          currentUserTurnIndex = messageIndex;
          continue;
        }

        nextUserTurnIndex = messageIndex;
        break;
      }

      return { currentUserTurnIndex, nextUserTurnIndex };
    })();

    let targetIndex = -1;

    if (renderedTurnNavigation?.nextUserTurnIndex !== null && renderedTurnNavigation?.nextUserTurnIndex !== undefined) {
      targetIndex = renderedTurnNavigation.nextUserTurnIndex;
    } else {
      const currentStartIndex = visibleRangeRef.current.startIndex;
      const cursorIndex =
        renderedTurnNavigation?.currentUserTurnIndex ??
        (lastScrollTarget.current !== null && lastScrollTarget.current >= currentStartIndex
          ? lastScrollTarget.current
          : currentStartIndex);

      for (let i = cursorIndex + 1; i < messages.length; i++) {
        if (messages[i].role === 'user') {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex === -1) {
        return;
      }
    }

    lastScrollTarget.current = targetIndex;
    virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
  }, [messages, scrollerRef]);

  const scrollToTop = useCallback(() => {
    if (messages.length === 0) {
      return;
    }

    lastScrollTarget.current = 0;
    virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' });
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    if (messages.length === 0) {
      return;
    }

    const targetIndex = messages.length - 1;
    lastScrollTarget.current = targetIndex;
    virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'end', behavior: 'smooth' });
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    if (document.hidden) return;

    const container = scrollerRef;
    if (container) {
      const { scrollTop } = container;

      // Save scroll position for active session
      if (activeSessionId && lastRestoredSessionIdRef.current === activeSessionId && messages.length > 0) {
        if (scrollSaveTimeoutRef.current) {
          clearTimeout(scrollSaveTimeoutRef.current);
        }
        scrollSaveTimeoutRef.current = window.setTimeout(() => {
          localStorage.setItem(`chat_scroll_pos_${activeSessionId}`, scrollTop.toString());
        }, 300);
      }
    }
  }, [scrollerRef, activeSessionId, messages.length]);

  useEffect(() => {
    return () => {
      if (scrollSaveTimeoutRef.current) {
        clearTimeout(scrollSaveTimeoutRef.current);
      }
      clearAnchorTimeout();
      clearRestoreTimeout();
    };
  }, [clearAnchorTimeout, clearRestoreTimeout]);

  // Restore scroll position on session change
  useEffect(() => {
    if (!activeSessionId) return;

    // Reset restoration state if we changed sessions
    if (lastRestoredSessionIdRef.current !== activeSessionId) {
      // If we have content, perform restoration
      if (messages.length > 0) {
        const savedPos = localStorage.getItem(`chat_scroll_pos_${activeSessionId}`);
        const sessionIdForRestore = activeSessionId;
        const messageCountForRestore = messages.length;
        clearRestoreTimeout();

        // Use setTimeout to allow Virtuoso to layout the items first
        restoreTimeoutRef.current = window.setTimeout(() => {
          restoreTimeoutRef.current = null;
          if (activeSessionIdRef.current !== sessionIdForRestore) return;

          if (savedPos !== null) {
            const top = parseInt(savedPos, 10);
            virtuosoRef.current?.scrollTo({ top });
          } else {
            // Default to bottom for new/unvisited sessions
            virtuosoRef.current?.scrollToIndex({ index: messageCountForRestore - 1, align: 'end' });
          }
          // Mark restoration as complete for this session ID
          lastRestoredSessionIdRef.current = sessionIdForRestore;
        }, 50);
      }
    }
  }, [activeSessionId, messages.length, clearRestoreTimeout]);

  const showScrollDown =
    !atBottom && messages.some((message, index) => index > visibleStartIndex && message.role === 'user');
  const showScrollUp = visibleStartIndex > 0;

  return {
    virtuosoRef,
    handleScrollerRef,
    setAtBottom,
    onRangeChanged,
    scrollToPrevTurn,
    scrollToNextTurn,
    scrollToTop,
    scrollToBottom,
    showScrollDown,
    showScrollUp,
    scrollerRef,
    handleScroll,
  };
};
