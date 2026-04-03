import React, { useRef, useEffect } from 'react';

interface PlaceholderProps {
    height: number;
    onVisible: () => void;
}

export const MessageListPlaceholder: React.FC<PlaceholderProps> = ({ height, onVisible }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onVisible();
                }
            },
            {
                root: null,
                rootMargin: '500px 0px',
                threshold: 0.01
            }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [onVisible]);

    return <div ref={ref} style={{ height: `${height}px` }} aria-hidden="true" />;
};