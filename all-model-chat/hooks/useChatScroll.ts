// hooks/useChatScroll.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatScrollProps {
    messages: ChatMessage[];
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatScroll = ({ messages, userScrolledUp }: ChatScrollProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollNavVisibility, setScrollNavVisibility] = useState({ up: false, down: false });

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
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messagesEndRef]);

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
            userScrolledUp.current = !isAtBottom;
        }
    }, [scrollContainerRef, userScrolledUp]);
    
    useEffect(() => { 
        if (!userScrolledUp.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, userScrolledUp]);

    return {
        messagesEndRef,
        scrollContainerRef,
        scrollNavVisibility,
        handleScroll,
        scrollToNextTurn,
        scrollToPrevTurn,
    };
};
