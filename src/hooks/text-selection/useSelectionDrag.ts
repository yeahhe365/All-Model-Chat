
/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
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

    const getClampedPosition = useCallback((clientX: number, clientY: number) => {
        if (!toolbarRef.current) return null;

        const toolbar = toolbarRef.current;
        const { width, height } = toolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 10;

        const maxLeft = Math.max(padding, viewportWidth - padding - width);
        const maxTop = Math.max(padding, viewportHeight - padding - height);

        const newLeft = Math.round(Math.max(padding, Math.min(clientX - dragOffset.current.x, maxLeft)));
        const newTop = Math.round(Math.max(padding, Math.min(clientY - dragOffset.current.y, maxTop)));

        return { toolbar, width, top: newTop, left: newLeft };
    }, [toolbarRef]);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current || !toolbarRef.current) return;
        
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        rafRef.current = requestAnimationFrame(() => {
            if (!isDragging.current) return;

            const nextPosition = getClampedPosition(e.clientX, e.clientY);
            if (!nextPosition) return;

            nextPosition.toolbar.style.left = `${nextPosition.left}px`;
            nextPosition.toolbar.style.top = `${nextPosition.top}px`;
        });
    }, [getClampedPosition, toolbarRef]);

    const handleDragEnd = useCallback((e: MouseEvent) => {
        if (!isDragging.current || !toolbarRef.current) return;
        isDragging.current = false;
        document.body.style.userSelect = '';
        
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        
        // Sync final position to React state
        const nextPosition = getClampedPosition(e.clientX, e.clientY);
        if (nextPosition) {
            onPositionChange({
                top: nextPosition.top,
                left: nextPosition.left + nextPosition.width / 2,
            });
        }

        if (toolbarRef.current) {
            toolbarRef.current.style.transition = '';
        }
    }, [getClampedPosition, onPositionChange, handleDragMove]);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0 || !position || !toolbarRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        
        isDragging.current = true;
        toolbarRef.current.style.transition = 'none';

        const rect = toolbarRef.current.getBoundingClientRect();
        
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
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
