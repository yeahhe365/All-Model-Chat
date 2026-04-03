
import React, { useRef, useCallback } from 'react';
import { ChatMessage } from '../../types';

interface ChatScrollProps {
    messages: ChatMessage[];
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatScroll = ({ messages, userScrolledUp }: ChatScrollProps) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const savedScrollTop = useRef<number>(0);
    
    // Track auto-scrolling state to differentiate from user interaction
    const isAutoScrolling = useRef(false);

    // Handler to detect explicit user interaction
    const handleUserInteraction = useCallback(() => {
        // If the user interacts via wheel or touch, they are manually controlling the view
        isAutoScrolling.current = false;
    }, []);
    
    // Callback ref to handle node mounting/unmounting, restore scroll, and attach listeners
    const setScrollContainerRef = useCallback((node: HTMLDivElement | null) => {
        // Cleanup listeners on old node
        if (scrollContainerRef.current) {
            scrollContainerRef.current.removeEventListener('wheel', handleUserInteraction);
            scrollContainerRef.current.removeEventListener('touchmove', handleUserInteraction);
        }

        scrollContainerRef.current = node;
        
        if (node) {
            // Restore position if available (Simple restoration for non-virtualized contexts or initial mount)
            if (savedScrollTop.current > 0) {
                node.scrollTop = savedScrollTop.current;
            }
            // Attach listeners to detect user scrolling vs code scrolling
            node.addEventListener('wheel', handleUserInteraction, { passive: true });
            node.addEventListener('touchmove', handleUserInteraction, { passive: true });
        }
    }, [handleUserInteraction]);

    const handleScroll = useCallback(() => {
        // Optimization: Skip scroll logic if hidden
        if (document.hidden) return;

        const container = scrollContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            
            // Save position for restoration
            savedScrollTop.current = scrollTop;
            
            // Tighter threshold (50px) to determine if we are "locked" to bottom
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

            // If the user moved and is not at bottom, mark as scrolled up
            if (isAtBottom) {
                userScrolledUp.current = false;
            } else if (!isAutoScrolling.current) {
                userScrolledUp.current = true;
            }
        }
    }, [userScrolledUp]);
    
    return {
        scrollContainerRef, 
        setScrollContainerRef, 
        handleScroll,
    };
};
