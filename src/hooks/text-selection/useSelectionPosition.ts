
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { convertHtmlToMarkdown } from '../../utils/htmlToMarkdown';

interface UseSelectionPositionProps {
    containerRef: React.RefObject<HTMLElement>;
    isAudioActive: boolean;
    toolbarRef: React.RefObject<HTMLDivElement>;
}

export const useSelectionPosition = ({ containerRef, isAudioActive, toolbarRef }: UseSelectionPositionProps) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const selectionBoundsRef = useRef<DOMRect | null>(null);

    // Monitor selection changes
    useEffect(() => {
        const handleSelectionChange = () => {
            if (isAudioActive) return;

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) {
                setPosition(null);
                selectionBoundsRef.current = null;
                setSelectedText('');
                return;
            }

            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;
            
            // Context checks
            const containerEl = containerRef.current;
            if (containerEl && !containerEl.contains(commonAncestor)) {
                setPosition(null);
                selectionBoundsRef.current = null;
                return;
            }

            const targetElement = commonAncestor.nodeType === 1 ? commonAncestor as HTMLElement : commonAncestor.parentElement;
            if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA')) {
                setPosition(null);
                selectionBoundsRef.current = null;
                return;
            }

            // Extract content
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            const html = container.innerHTML;
            const text = convertHtmlToMarkdown(html).trim();

            if (!text) {
                setPosition(null);
                selectionBoundsRef.current = null;
                setSelectedText('');
                return;
            }

            const rect = range.getBoundingClientRect();
            selectionBoundsRef.current = rect;
            
            setPosition({
                top: rect.top - 50, 
                left: rect.left + (rect.width / 2)
            });
            setSelectedText(text);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('mouseup', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('mouseup', handleSelectionChange);
            document.removeEventListener('keyup', handleSelectionChange);
        };
    }, [containerRef, isAudioActive]);

    // Screen boundary clamping
    useLayoutEffect(() => {
        if (!position || !toolbarRef.current) return;

        const toolbar = toolbarRef.current;
        const { width, height } = toolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 10;

        let correctedLeft = position.left;
        let correctedTop = position.top;
        const halfWidth = width / 2;
        
        // Horizontal
        if (correctedLeft - halfWidth < padding) correctedLeft = padding + halfWidth;
        if (correctedLeft + halfWidth > viewportWidth - padding) correctedLeft = viewportWidth - padding - halfWidth;

        // Vertical
        if (correctedTop < padding) {
            if (selectionBoundsRef.current) {
                const belowPos = selectionBoundsRef.current.bottom + 10;
                if (belowPos + height < viewportHeight - padding) {
                    correctedTop = belowPos;
                } else {
                    correctedTop = padding;
                }
            } else {
                correctedTop = padding;
            }
        }
        if (correctedTop + height > viewportHeight - padding) {
            correctedTop = viewportHeight - padding - height;
        }

        if (Math.abs(correctedLeft - position.left) > 1 || Math.abs(correctedTop - position.top) > 1) {
            setPosition({ left: correctedLeft, top: correctedTop });
        }
    }, [position, selectedText]); // Re-run when text changes (toolbar size might change)

    const clearSelection = () => {
        window.getSelection()?.removeAllRanges();
        setPosition(null);
    };

    return { position, setPosition, selectedText, clearSelection };
};
