
import { useRef, useCallback, useState, useLayoutEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatScrollProps {
    messages: ChatMessage[];
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatScroll = ({ messages, userScrolledUp }: ChatScrollProps) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [scrollNavVisibility, setScrollNavVisibility] = useState({ up: false, down: false });
    
    const savedScrollTop = useRef<number>(0);
    
    // Callback ref to handle node mounting/unmounting and restore scroll
    const setScrollContainerRef = useCallback((node: HTMLDivElement | null) => {
        scrollContainerRef.current = node;
        if (node) {
            // Restore scroll position if we have a saved value
            if (savedScrollTop.current > 0) {
                node.scrollTop = savedScrollTop.current;
            }
        }
    }, []);
    
    // This ref stores the scroll state *before* new messages are rendered.
    const scrollStateBeforeUpdate = useRef<{ scrollHeight: number; scrollTop: number; } | null>(null);

    // After DOM updates, adjust scroll position based on the captured state.
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        // Only run the logic if we have a captured state from a message update.
        if (container && scrollStateBeforeUpdate.current) {
            const { scrollHeight: prevScrollHeight, scrollTop: prevScrollTop } = scrollStateBeforeUpdate.current;
            const { clientHeight, scrollHeight: newScrollHeight } = container;

            const wasAtBottom = prevScrollHeight - clientHeight - prevScrollTop < 100;

            const forceScroll = !userScrolledUp.current;

            // If the user was already at the bottom OR if userScrolledUp is false (forceScroll)
            // (meaning a send just happened and auto-scroll is on), scroll down.
            if (wasAtBottom || forceScroll) {
                container.scrollTo({
                    top: newScrollHeight,
                    // Use 'auto' for instant scroll on send, 'smooth' for streaming while at bottom.
                    behavior: forceScroll ? 'auto' : 'smooth',
                });
            }
            
            // After using the captured state, reset it to null.
            scrollStateBeforeUpdate.current = null;
        }
    });


    // Capture scroll state *before* the DOM updates with new messages.
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            scrollStateBeforeUpdate.current = {
                scrollHeight: container.scrollHeight,
                scrollTop: container.scrollTop,
            };
        }
    }, [messages]);

    const scrollToNextTurn = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const allMessages = Array.from(container.querySelectorAll<HTMLElement>('[data-message-role]'));
        
        const modelResponseElements: HTMLElement[] = [];
        for (let i = 1; i < allMessages.length; i++) {
            const currentEl = allMessages[i];
            const prevEl = allMessages[i-1];
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
            const currentEl = allMessages[i];
            const prevEl = allMessages[i-1];
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
        const container = scrollContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            const isAtTop = scrollTop < 100;
            
            // Save position for restoration
            savedScrollTop.current = scrollTop;

            setScrollNavVisibility({
                up: !isAtTop && scrollHeight > clientHeight,
                down: !isAtBottom,
            });
            userScrolledUp.current = !isAtBottom;
        }
    }, [userScrolledUp]);
    
    return {
        scrollContainerRef, // The RefObject (for external imperative access)
        setScrollContainerRef, // The callback ref (for the DOM element)
        scrollNavVisibility,
        handleScroll,
        scrollToNextTurn,
        scrollToPrevTurn,
    };
};
