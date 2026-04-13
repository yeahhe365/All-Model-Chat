
import React, { forwardRef } from 'react';
import { createPortal } from 'react-dom';

interface ToolbarContainerProps {
    children: React.ReactNode;
    position: { top: number; left: number };
    isDragging: boolean;
}

export const ToolbarContainer = forwardRef<HTMLDivElement, ToolbarContainerProps>(({ children, position, isDragging }, ref) => {
    return createPortal(
        <div 
            ref={ref}
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
