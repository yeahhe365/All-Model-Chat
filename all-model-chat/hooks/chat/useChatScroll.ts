
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { ChatMessage } from '../../types';

interface ChatScrollProps {
    messages: ChatMessage[];
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatScroll = ({ messages, userScrolledUp }: ChatScrollProps) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [scrollNavVisibility, setScrollNavVisibility] = useState({ up: false, down: false });
    const savedScrollTop = useRef<number>(0);
    
    // Track previous message count to identify new turns
    const prevMsgLength = useRef(messages.length);
    const isAutoScrolling = useRef(false);
    const scrollTimeoutRef = useRef<number | null>(null);

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
            // Restore position if available
            if (savedScrollTop.current > 0) {
                node.scrollTop = savedScrollTop.current;
            }
            // Attach listeners to detect user scrolling vs code scrolling
            node.addEventListener('wheel', handleUserInteraction, { passive: true });
            node.addEventListener('touchmove', handleUserInteraction, { passive: true });
        }
    }, [handleUserInteraction]);

    const scrollToNextTurn = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const allMessages = Array.from(container.querySelectorAll<HTMLElement>('[data-message-role]'));
        
        const modelResponseElements: HTMLElement[] = [];
        for (let i = 1; i < allMessages.length; i++) {
            const currentEl = allMessages[i] as HTMLElement;
            const prevEl = allMessages[i-1] as HTMLElement;
            if ((currentEl.dataset.messageRole === 'model' || currentEl.dataset.messageRole === 'error') && prevEl.dataset.messageRole === 'user') {
                modelResponseElements.push(currentEl);
            }
        }
        
        const viewTop = container.scrollTop;
        const target = modelResponseElements.find(el => el.offsetTop > viewTop + 10);
        
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    const scrollToPrevTurn = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const allMessages = Array.from(container.querySelectorAll<HTMLElement>('[data-message-role]'));
        
        const modelResponseElements: HTMLElement[] = [];
        for (let i = 1; i < allMessages.length; i++) {
            const currentEl = allMessages[i] as HTMLElement;
            const prevEl = allMessages[i-1] as HTMLElement;
            if ((currentEl.dataset.messageRole === 'model' || currentEl.dataset.messageRole === 'error') && prevEl.dataset.messageRole === 'user') {
                modelResponseElements.push(currentEl);
            }
        }
        
        const viewTop = container.scrollTop;
        const target = [...modelResponseElements].reverse().find(el => el.offsetTop < viewTop - 10);
        
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleScroll = useCallback(() => {
        // Optimization: Skip scroll logic if hidden
        if (document.hidden) return;

        const container = scrollContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Tighter threshold (50px) to determine if we are "locked" to bottom
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
            const isAtTop = scrollTop < 100;
            
            // Save position for restoration
            savedScrollTop.current = scrollTop;

            setScrollNavVisibility({
                up: !isAtTop && scrollHeight > clientHeight,
                down: !isAtBottom,
            });
            
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
        scrollNavVisibility,
        handleScroll,
        scrollToNextTurn,
        scrollToPrevTurn,
    };
};
