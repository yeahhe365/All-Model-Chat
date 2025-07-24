// hooks/useChatScroll.ts
import { useRef, useCallback, useState, useLayoutEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatScrollProps {
    messages: ChatMessage[];
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatScroll = ({ messages, userScrolledUp }: ChatScrollProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollNavVisibility, setScrollNavVisibility] = useState({ up: false, down: false });
    
    // This ref stores the scroll state *before* new messages are rendered.
    const scrollStateBeforeUpdate = useRef<{ scrollHeight: number; scrollTop: number; } | null>(null);

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
    }, [messages]); // This effect runs when `messages` change, capturing the "before" state.

    // After DOM updates, adjust scroll position based on the captured state.
    // This runs *after* the DOM has been updated and painted.
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (container && scrollStateBeforeUpdate.current) {
            const { scrollHeight: prevScrollHeight, scrollTop: prevScrollTop } = scrollStateBeforeUpdate.current;
            const { clientHeight, scrollHeight: newScrollHeight } = container;

            // If user was scrolled to the bottom (or very close) before the update,
            // then auto-scroll to the new bottom. A threshold of 100px provides a good buffer.
            if (prevScrollHeight - clientHeight - prevScrollTop < 100) {
                container.scrollTop = newScrollHeight;
            }
        }
    }); // This effect runs after every render to apply the scroll adjustment.


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
        messagesEndRef,
        scrollContainerRef,
        scrollNavVisibility,
        handleScroll,
        scrollToNextTurn,
        scrollToPrevTurn,
    };
};