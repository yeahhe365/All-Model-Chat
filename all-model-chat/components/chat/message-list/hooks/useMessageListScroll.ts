
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
                }, 50);
            }
        }
        prevMsgCount.current = messages.length;
    }, [messages.length, messages]); // Depend on messages content to ensure role checks are fresh

    const scrollToPrevTurn = useCallback(() => {
        // Fix: Simply jump to the previous item index regardless of role.
        // This prevents skipping long user messages.
        const currentStartIndex = visibleRangeRef.current.startIndex;
        const targetIndex = Math.max(0, currentStartIndex - 1);
        
        virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
    }, []);

    const scrollToNextTurn = useCallback(() => {
        // 获取当前视窗中最上面一条消息的索引
        const currentStartIndex = visibleRangeRef.current.startIndex;
        
        // 目标是下一条消息
        let targetIndex = currentStartIndex + 1;

        // 如果已经是最后一条，则确保对齐到底部
        if (targetIndex >= messages.length) {
            virtuosoRef.current?.scrollToIndex({ 
                index: messages.length - 1, 
                align: 'end', 
                behavior: 'smooth' 
            });
        } else {
            // 否则跳转到下一条消息的顶部
            virtuosoRef.current?.scrollToIndex({ 
                index: targetIndex, 
                align: 'start', 
                behavior: 'smooth' 
            });
        }
    }, [messages.length]);

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
