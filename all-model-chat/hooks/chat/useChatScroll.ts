
import React, { useRef, useCallback, useState, useLayoutEffect } from 'react';
import { ChatMessage } from '../../types';

interface ChatScrollProps {
    messages: ChatMessage[];
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatScroll = ({ messages, userScrolledUp }: ChatScrollProps) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [scrollNavVisibility, setScrollNavVisibility] = useState({ up: false, down: false });
    const savedScrollTop = useRef<number>(0);
    
    // Track previous message count to distinguish between "New Message" (auto scroll) and "Streaming" (smooth scroll)
    const prevMsgLength = useRef(messages.length);
    const isAutoScrolling = useRef(false);
    const scrollTimeoutRef = useRef<number | null>(null);

    // Handler to detect explicit user interaction
    const handleUserInteraction = useCallback(() => {
        // If the user interacts via wheel or touch, immediately break the auto-scroll lock
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

    // Scroll to bottom logic
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            // Optimization: Do not auto-scroll if the tab is in the background
            // This prevents the browser from doing heavy layout calculations when not needed
            if (document.hidden) return;

            // If user hasn't scrolled up, keep at bottom
            if (!userScrolledUp.current) {
                const isNewMessage = messages.length > prevMsgLength.current;
                
                // Use 'auto' (instant) for both new messages and streaming to ensure stability.
                // CSS scroll-behavior: smooth can conflict with rapid JS scroll updates.
                // We handle smooth scrolling manually for navigation buttons only.
                const behavior = 'auto';
                
                isAutoScrolling.current = true;
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior
                });

                if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
                // Shorter timeout since 'auto' is instant
                scrollTimeoutRef.current = window.setTimeout(() => {
                    isAutoScrolling.current = false;
                }, 100);
            }
        }
        prevMsgLength.current = messages.length;
    }, [messages, userScrolledUp]);

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
            
            // Logic:
            // 1. If code is scrolling (isAutoScrolling), ignore the event unless we hit bottom.
            // 2. If we hit bottom, reset userScrolledUp to false (re-attach).
            // 3. If code is NOT scrolling, the user moved. If not at bottom, mark as scrolled up (detach).
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
