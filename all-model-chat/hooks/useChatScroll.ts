import { useRef, useCallback, useState, useLayoutEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatScrollProps {
    messages: ChatMessage[];
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatScroll = ({ messages, userScrolledUp }: ChatScrollProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollNavVisibility, setScrollNavVisibility] = useState({ up: false, down: false });
    
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
            // This prevents this effect from running with stale data on subsequent re-renders
            // that are not triggered by a message change, which could interfere with user scrolling.
            scrollStateBeforeUpdate.current = null;
        }
    }); // No dependency array, runs after every render to apply the adjustment once.


    // Capture scroll state *before* the DOM updates with new messages.
    // This runs after React calculates the DOM changes but before it commits them to the screen.
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            scrollStateBeforeUpdate.current = {
                scrollHeight: container.scrollHeight,
                scrollTop: container.scrollTop,
            };
        }
    }, [messages]); // This effect runs only when `messages` change.

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

            setScrollNavVisibility({
                up: !isAtTop && scrollHeight > clientHeight,
                down: !isAtBottom,
            });
            // This ref is still useful for other parts of the app (like nav buttons)
            userScrolledUp.current = !isAtBottom;
        }
    }, [userScrolledUp]);
    
    return {
        scrollContainerRef,
        scrollNavVisibility,
        handleScroll,
        scrollToNextTurn,
        scrollToPrevTurn,
    };
};