
import { useRef, useCallback } from 'react';

interface ChatScrollProps {
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatScroll = ({ userScrolledUp }: ChatScrollProps) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const setScrollContainerRef = useCallback((node: HTMLDivElement | null) => {
        scrollContainerRef.current = node;
    }, []);

    const handleScroll = useCallback(() => {
        if (document.hidden) return;

        const container = scrollContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

            userScrolledUp.current = !isAtBottom;
        }
    }, [userScrolledUp]);
    
    return {
        scrollContainerRef, 
        setScrollContainerRef, 
        handleScroll,
    };
};
