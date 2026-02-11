
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
    
    // Track the last index we programmatically scrolled to
    const lastScrollTarget = useRef<number | null>(null);

    // Track state for the anchoring effect specifically
    const prevMsgCount = useRef(messages.length);
    const prevSessionIdForAnchor = useRef(activeSessionId);

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
    }, [messages, activeSessionId]);

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
        const currentStartIndex = visibleRangeRef.current.startIndex;
        let targetIndex = -1;
        
        let startSearchIndex = currentStartIndex + 1;
        
        if (lastScrollTarget.current !== null && 
            Math.abs(currentStartIndex - lastScrollTarget.current) <= 1) {
             startSearchIndex = Math.max(startSearchIndex, lastScrollTarget.current + 1);
        }
        
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
             lastScrollTarget.current = messages.length - 1;
             virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end', behavior: 'smooth' });
        }
    }, [messages]);

    const handleScroll = useCallback(() => {
        if (document.hidden) return;

        const container = scrollerRef;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
            
            if (isAtBottom !== atBottom) {
                setAtBottom(isAtBottom);
            }

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
    }, [scrollerRef, atBottom, activeSessionId, messages.length]);

    // Restore scroll position on session change
    useEffect(() => {
        if (!activeSessionId) return;

        // Reset restoration state if we changed sessions
        if (lastRestoredSessionIdRef.current !== activeSessionId) {
             // If we have content, perform restoration
             if (messages.length > 0) {
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
                    // Mark restoration as complete for this session ID
                    lastRestoredSessionIdRef.current = activeSessionId;
                }, 50);
             }
        }
    }, [activeSessionId, messages.length]);

    // Attach listener manually to the scroller ref
    useEffect(() => {
        const container = scrollerRef;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [scrollerRef, handleScroll]);

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
        handleScroll
    };
};
