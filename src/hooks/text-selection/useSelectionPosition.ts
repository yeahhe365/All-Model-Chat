
/* eslint-disable react-hooks/refs */
import { useState, useRef, useEffect, useMemo } from 'react';
import { convertHtmlToMarkdown } from '../../utils/htmlToMarkdown';

type ContainerRefLike = React.RefObject<HTMLElement> | HTMLElement | null;

interface UseSelectionPositionProps {
    containerRef: ContainerRefLike;
    isAudioActive: boolean;
    toolbarRef: React.RefObject<HTMLDivElement>;
}

const resolveContainerElement = (containerRef: ContainerRefLike): HTMLElement | null => {
    if (!containerRef) return null;
    if ('current' in containerRef) return containerRef.current;
    return containerRef;
};

const isEditableElement = (element: Element | null): boolean => {
    if (!(element instanceof HTMLElement)) return false;

    return (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.isContentEditable
    );
};

export const useSelectionPosition = ({ containerRef, isAudioActive, toolbarRef }: UseSelectionPositionProps) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const selectionBoundsRef = useRef<DOMRect | null>(null);
    const selectedTextRef = useRef('');

    // Monitor selection changes
    useEffect(() => {
        const clearSelectionState = () => {
            setPosition(null);
            selectionBoundsRef.current = null;
            selectedTextRef.current = '';
            setSelectedText('');
        };

        const handleSelectionChange = () => {
            if (isAudioActive) {
                return;
            }

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) {
                clearSelectionState();
                return;
            }

            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;
            
            // Context checks
            const containerEl = resolveContainerElement(containerRef);
            if (containerEl && !containerEl.contains(commonAncestor)) {
                clearSelectionState();
                return;
            }

            const targetElement = commonAncestor.nodeType === 1 ? commonAncestor as HTMLElement : commonAncestor.parentElement;
            if (isEditableElement(targetElement)) {
                clearSelectionState();
                return;
            }

            // Extract content
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            const html = container.innerHTML;
            const text = convertHtmlToMarkdown(html).trim();

            if (!text) {
                clearSelectionState();
                return;
            }

            const rect = range.getBoundingClientRect();
            selectionBoundsRef.current = rect;
            selectedTextRef.current = text;
            
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

    useEffect(() => {
        const handleCopy = (e: ClipboardEvent) => {
            if (isAudioActive) {
                return;
            }

            const activeElement = document.activeElement;
            if (isEditableElement(activeElement)) {
                return;
            }

            const text = selectedTextRef.current;
            if (!text || !e.clipboardData) {
                return;
            }

            e.preventDefault();
            e.clipboardData.setData('text/plain', text);
        };

        document.addEventListener('copy', handleCopy);
        return () => document.removeEventListener('copy', handleCopy);
    }, [isAudioActive]);

    const clampedPosition = useMemo(() => {
        if (!position || !toolbarRef.current) return position;

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
            return { left: correctedLeft, top: correctedTop };
        }

        return position;
    }, [position, toolbarRef]); // Re-run when text changes (toolbar size might change)

    const clearSelection = () => {
        window.getSelection()?.removeAllRanges();
        selectionBoundsRef.current = null;
        selectedTextRef.current = '';
        setPosition(null);
        setSelectedText('');
    };

    return { position: clampedPosition, setPosition, selectedText, clearSelection };
};
