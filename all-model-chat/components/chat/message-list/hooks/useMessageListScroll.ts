
import { useRef, useState, useCallback, useEffect } from 'react';
import { VirtuosoHandle } from 'react-virtuoso';
import { ChatMessage } from '../../../types';

interface UseMessageListScrollProps {
    messages: ChatMessage[];
    setScrollContainerRef: (node: HTMLDivElement | null) => void;
}

export const useMessageListScroll = ({ messages, setScrollContainerRef }: UseMessageListScrollProps) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [atBottom, setAtBottom] = useState(true);
    const [scrollerRef, setInternalScrollerRef] = useState<HTMLElement | null>(null);
    const visibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });

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
        const currentIndex = visibleRangeRef.current.startIndex;
        let targetIndex = -1;

        // Find the first model message ABOVE the current view
        for (let i = currentIndex - 1; i >= 0; i--) {
            const msg = messages[i];
            const prevMsg = messages[i - 1];
            // Turn boundary: Model message preceded by User message
            if (msg.role === 'model' && prevMsg?.role === 'user') {
                targetIndex = i;
                break;
            }
        }
        
        if (targetIndex === -1 && currentIndex > 0) targetIndex = 0;

        if (targetIndex !== -1) {
            virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
        }
    }, [messages]);

    const scrollToNextTurn = useCallback(() => {
        const currentIndex = visibleRangeRef.current.startIndex;
        let targetIndex = -1;

        // Find the first model message BELOW the current view
        for (let i = currentIndex + 1; i < messages.length; i++) {
            const msg = messages[i];
            const prevMsg = messages[i - 1];
            // Turn boundary
            if (msg.role === 'model' && prevMsg?.role === 'user') {
                targetIndex = i;
                break;
            }
        }

        if (targetIndex !== -1) {
            virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
        } else {
            virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end', behavior: 'smooth' });
        }
    }, [messages]);

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
        scrollerRef
    };
};
