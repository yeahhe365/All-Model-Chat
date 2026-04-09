
import React, { forwardRef, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ToolbarContainerProps {
    children: React.ReactNode;
    position: { top: number; left: number };
    selectionBounds: DOMRect | null;
    isDragging: boolean;
}

export const ToolbarContainer = forwardRef<HTMLDivElement, ToolbarContainerProps>(({ children, position, selectionBounds, isDragging }, forwardedRef) => {
    const localRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        const toolbar = localRef.current;
        if (!toolbar) return;

        const { width, height } = toolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 10;

        let correctedLeft = position.left;
        let correctedTop = position.top;
        const halfWidth = width / 2;

        if (correctedLeft - halfWidth < padding) correctedLeft = padding + halfWidth;
        if (correctedLeft + halfWidth > viewportWidth - padding) correctedLeft = viewportWidth - padding - halfWidth;

        if (correctedTop < padding) {
            const belowPos = selectionBounds ? selectionBounds.bottom + 10 : padding;
            correctedTop = belowPos + height < viewportHeight - padding ? belowPos : padding;
        }
        if (correctedTop + height > viewportHeight - padding) {
            correctedTop = viewportHeight - padding - height;
        }

        toolbar.style.top = `${correctedTop}px`;
        toolbar.style.left = `${correctedLeft}px`;
    }, [children, position, selectionBounds]);

    const handleRef = (element: HTMLDivElement | null) => {
        localRef.current = element;
        if (typeof forwardedRef === 'function') {
            forwardedRef(element);
        } else if (forwardedRef) {
            forwardedRef.current = element;
        }
    };

    return createPortal(
        <div 
            ref={handleRef}
            className="fixed z-[9999] flex items-center p-0.5 gap-0 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-full shadow-lg pointer-events-auto animate-in fade-in zoom-in"
            style={{ 
                top: position.top, 
                left: position.left, 
                transform: 'translateX(-50%)',
                transition: isDragging ? 'none' : 'opacity 0.2s, transform 0.2s'
            }}
        >
            {children}
        </div>,
        document.body
    );
});

ToolbarContainer.displayName = 'ToolbarContainer';
