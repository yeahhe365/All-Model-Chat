
import React, { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToolbarContainerProps {
    children: React.ReactNode;
    position: { top: number; left: number };
    isDragging: boolean;
}

export const ToolbarContainer = forwardRef<HTMLDivElement, ToolbarContainerProps>(({ children, position, isDragging }, ref) => {
    const localRef = useRef<HTMLDivElement | null>(null);
    const [renderPosition, setRenderPosition] = useState(position);

    const handleRef = useCallback((node: HTMLDivElement | null) => {
        localRef.current = node;

        if (typeof ref === 'function') {
            ref(node);
            return;
        }

        if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
    }, [ref]);

    useLayoutEffect(() => {
        const clampToViewport = () => {
            const toolbar = localRef.current;
            if (!toolbar) {
                setRenderPosition(position);
                return;
            }

            const rect = toolbar.getBoundingClientRect();
            const padding = 10;
            const halfWidth = rect.width / 2;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let nextLeft = position.left;
            let nextTop = position.top;

            if (nextLeft - halfWidth < padding) {
                nextLeft = padding + halfWidth;
            }
            if (nextLeft + halfWidth > viewportWidth - padding) {
                nextLeft = viewportWidth - padding - halfWidth;
            }

            if (nextTop < padding) {
                nextTop = padding;
            }
            if (nextTop + rect.height > viewportHeight - padding) {
                nextTop = viewportHeight - padding - rect.height;
            }

            setRenderPosition((prev) => {
                if (prev.left === nextLeft && prev.top === nextTop) {
                    return prev;
                }

                return { left: nextLeft, top: nextTop };
            });
        };

        clampToViewport();

        const resizeObserver =
            typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(() => clampToViewport())
                : null;

        if (localRef.current) {
            resizeObserver?.observe(localRef.current);
        }

        window.addEventListener('resize', clampToViewport);
        window.visualViewport?.addEventListener('resize', clampToViewport);
        window.visualViewport?.addEventListener('scroll', clampToViewport);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', clampToViewport);
            window.visualViewport?.removeEventListener('resize', clampToViewport);
            window.visualViewport?.removeEventListener('scroll', clampToViewport);
        };
    }, [children, position]);

    return createPortal(
        <div 
            ref={handleRef}
            className="fixed z-[9999] flex max-w-[calc(100vw-20px)] items-center gap-0 overflow-x-auto rounded-full border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] p-px shadow-lg pointer-events-auto no-scrollbar animate-in fade-in zoom-in"
            style={{ 
                top: renderPosition.top, 
                left: renderPosition.left, 
                translate: '-50% 0',
                transition: isDragging ? 'none' : 'opacity 0.2s, translate 0.2s'
            }}
        >
            {children}
        </div>,
        document.body
    );
});

ToolbarContainer.displayName = 'ToolbarContainer';
