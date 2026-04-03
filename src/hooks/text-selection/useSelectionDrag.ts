
import { useRef, useEffect, useCallback } from 'react';

interface UseSelectionDragProps {
    toolbarRef: React.RefObject<HTMLDivElement>;
    position: { top: number; left: number } | null;
    onPositionChange: (pos: { top: number; left: number }) => void;
}

export const useSelectionDrag = ({ toolbarRef, position, onPositionChange }: UseSelectionDragProps) => {
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current || !toolbarRef.current) return;
        
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        rafRef.current = requestAnimationFrame(() => {
            if (!isDragging.current || !toolbarRef.current) return;
            
            const toolbar = toolbarRef.current;
            const { width, height } = toolbar.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const padding = 10;

            let newLeft = e.clientX - dragOffset.current.x;
            let newTop = e.clientY - dragOffset.current.y;
            
            const halfWidth = width / 2;
            newLeft = Math.max(padding + halfWidth, Math.min(newLeft, viewportWidth - padding - halfWidth));
            newTop = Math.max(padding, Math.min(newTop, viewportHeight - padding - height));

            toolbar.style.left = `${newLeft}px`;
            toolbar.style.top = `${newTop}px`;
        });
    }, [toolbarRef]);

    const handleDragEnd = useCallback((e: MouseEvent) => {
        if (!isDragging.current || !toolbarRef.current) return;
        isDragging.current = false;
        document.body.style.userSelect = '';
        
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        
        // Sync final position to React state
        const toolbar = toolbarRef.current;
        const { width, height } = toolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 10;

        let newLeft = e.clientX - dragOffset.current.x;
        let newTop = e.clientY - dragOffset.current.y;

        const halfWidth = width / 2;
        newLeft = Math.max(padding + halfWidth, Math.min(newLeft, viewportWidth - padding - halfWidth));
        newTop = Math.max(padding, Math.min(newTop, viewportHeight - padding - height));
        
        onPositionChange({ top: newTop, left: newLeft });
        
        if (toolbarRef.current) {
            toolbarRef.current.style.transition = '';
        }
    }, [onPositionChange, handleDragMove]);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0 || !position || !toolbarRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        
        isDragging.current = true;
        toolbarRef.current.style.transition = 'none';
        
        dragOffset.current = {
            x: e.clientX - position.left,
            y: e.clientY - position.top
        };
        
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    }, [position, handleDragMove, handleDragEnd]);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [handleDragMove, handleDragEnd]);

    return { handleDragStart, isDragging };
};
