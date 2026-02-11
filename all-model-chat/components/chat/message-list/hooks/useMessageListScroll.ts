
import { useRef, useState, useCallback, useEffect } from 'react';
import { VirtuosoHandle } from 'react-virtuoso';
import { ChatMessage } from '../../../types';

interface UseMessageListScrollProps {
    messages: ChatMessage[];
    setScrollContainerRef: (node: HTMLDivElement | null) => void;
    activeSessionId: string | null;
}

export const useMessageListScroll = ({ messages, setScrollContainerRef, activeSessionId }: UseMessageListScrollProps) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [atBottom, setAtBottom] = useState(true);
    const [scrollerRef, setInternalScrollerRef] = useState<HTMLElement | null>(null);
    const visibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });
    
    const scrollSaveTimeoutRef = useRef<number | null>(null);
    const lastRestoredSessionIdRef = useRef<string | null>(null);
    
    // Track the last index we programmatically scrolled to, to prevent "getting stuck" 
    // if the startIndex reports slightly off or if we want to force advance.
    const lastScrollTarget = useRef<number | null>(null);

    // Sync internal scroller ref with parent's expectations
    useEffect(() => {
        if (scrollerRef) {
            setScrollContainerRef(scrollerRef as HTMLDivElement);
        }
    }, [scrollerRef, setScrollContainerRef]);

    // Range tracking for navigation
    const onRangeChanged = useCallback(({ startIndex, endIndex }: { startIndex: number, endIndex: number }) => {
        visibleRangeRef.current = { startIndex, endIndex };
    }, []);

    // Handle New Turn Anchoring: When a message is sent, scroll the model's message to the top.
    const prevMsgCount = useRef(messages.length);
    useEffect(() => {
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
                // Anchor view to the top of the model message (start of response)
                // Timeout ensures render cycle is complete including footer height adjustment
                setTimeout(() => {
                    virtuosoRef.current?.scrollToIndex({
                        index: targetIndex,
                        align: 'start',
                        behavior: 'smooth'
                    });
                    lastScrollTarget.current = targetIndex;
                }, 50);
            }
        }
        prevMsgCount.current = messages.length;
    }, [messages]); // Depend on messages content to ensure role checks are fresh

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
             // If no previous user message found (e.g. at top), scroll to 0
             virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' });
        }
    }, [messages]);

    const scrollToNextTurn = useCallback(() => {
        const currentStartIndex = visibleRangeRef.current.startIndex;
        let targetIndex = -1;
        
        let startSearchIndex = currentStartIndex + 1;
        
        // Anti-stuck logic: If we are effectively at the last target we programmatically scrolled to,
        // start searching from AFTER it to avoid finding the same message again.
        // We check if current visible range start is close to the last target (within 1 item tolerance).
        if (lastScrollTarget.current !== null && 
            Math.abs(currentStartIndex - lastScrollTarget.current) <= 1) {
             startSearchIndex = Math.max(startSearchIndex, lastScrollTarget.current + 1);
        }
        
        // Search forwards from calculated start index
        for (let i = startSearchIndex; i < messages.length; i++) {
             if (messages[i].role === 'user') {
                 targetIndex = i;
                 break;
             }
        }
        
        if (targetIndex !== -1) {
             lastScrollTarget.current = targetIndex;
             virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
        } else {
             // If no next user message found (at bottom), scroll to end
             lastScrollTarget.current = messages.length - 1;
             virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end', behavior: 'smooth' });
        }
    }, [messages]);

    // Note: This handleScroll is primarily used to update the Visibility state for the floating buttons.
    // Virtuoso handles the actual 'atBottom' state internally which we capture via setAtBottom.
    const handleScroll = useCallback(() => {
        // Optimization: Skip scroll logic if hidden
        if (document.hidden) return;

        const container = scrollerRef;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            
            // Increased threshold to 150px to prevent button flickering during rapid streaming/growth
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
            
            // Manually update atBottom if we diverged from Virtuoso's internal state due to threshold diff
            if (isAtBottom !== atBottom) {
                setAtBottom(isAtBottom);
            }

            // Save scroll position for active session
            if (activeSessionId) {
                if (scrollSaveTimeoutRef.current) {
                    clearTimeout(scrollSaveTimeoutRef.current);
                }
                scrollSaveTimeoutRef.current = window.setTimeout(() => {
                    localStorage.setItem(`chat_scroll_pos_${activeSessionId}`, scrollTop.toString());
                }, 300);
            }
        }
    }, [scrollerRef, atBottom, activeSessionId]);

    // Restore scroll position on session change
    useEffect(() => {
        if (!activeSessionId) return;

        // If we haven't restored for this session yet, or if messages just loaded (length > 0)
        // We check messages.length > 0 to avoid trying to scroll on an empty list
        if (messages.length > 0 && lastRestoredSessionIdRef.current !== activeSessionId) {
            const savedPos = localStorage.getItem(`chat_scroll_pos_${activeSessionId}`);
            
            // Use setTimeout to allow Virtuoso to layout the items first
            setTimeout(() => {
                if (savedPos !== null) {
                    const top = parseInt(savedPos, 10);
                    virtuosoRef.current?.scrollTo({ top });
                } else {
                    // Default to bottom for new/unvisited sessions
                    virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end' });
                }
            }, 50);

            lastRestoredSessionIdRef.current = activeSessionId;
        }
    }, [activeSessionId, messages.length]);

    // Attach listener manually to the scroller ref since Virtuoso's onScroll doesn't always fire for programmatic scrolls
    useEffect(() => {
        const container = scrollerRef;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [scrollerRef, handleScroll]);

    // Determine nav visibility based on `atBottom` and list length
    const showScrollDown = !atBottom;
    const showScrollUp = messages.length > 2 && visibleRangeRef.current.startIndex > 0;

    return {
        virtuosoRef,
        setInternalScrollerRef,
        setAtBottom,
        onRangeChanged,
        scrollToPrevTurn,
        scrollToNextTurn,
        showScrollDown,
        showScrollUp,
        scrollerRef,
        handleScroll // Exported for ChatArea if needed, though internal listener handles most
    };
};
