
import React, { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToolbarContainerProps {
    children: React.ReactNode;
    position: { top: number; left: number };
    isDragging: boolean;
}

const VIEWPORT_PADDING = 10;

const getToolbarRenderPosition = (
    position: { top: number; left: number },
    rect: Pick<DOMRect, 'width' | 'height'>,
    viewportWidth: number,
    viewportHeight: number
) => {
    const maxLeft = Math.max(VIEWPORT_PADDING, viewportWidth - VIEWPORT_PADDING - rect.width);
    const maxTop = Math.max(VIEWPORT_PADDING, viewportHeight - VIEWPORT_PADDING - rect.height);

    return {
        left: Math.min(Math.max(Math.round(position.left - rect.width / 2), VIEWPORT_PADDING), maxLeft),
        top: Math.min(Math.max(Math.round(position.top), VIEWPORT_PADDING), maxTop),
    };
};

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
                setRenderPosition({
                    left: Math.round(position.left),
                    top: Math.round(position.top),
                });
                return;
            }

            const rect = toolbar.getBoundingClientRect();
            const nextPosition = getToolbarRenderPosition(position, rect, window.innerWidth, window.innerHeight);

            setRenderPosition((prev) => {
                if (prev.left === nextPosition.left && prev.top === nextPosition.top) {
                    return prev;
                }

                return nextPosition;
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
            className="fixed z-[9999] flex max-w-[calc(100vw-20px)] items-center gap-0 overflow-x-auto rounded-full border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] p-px shadow-lg pointer-events-auto no-scrollbar"
            style={{ 
                top: renderPosition.top, 
                left: renderPosition.left, 
                animation: 'fadeIn 0.2s var(--ease-out-expo) both',
                transition: isDragging ? 'none' : 'opacity 0.2s'
            }}
        >
            {children}
        </div>,
        document.body
    );
});

ToolbarContainer.displayName = 'ToolbarContainer';
