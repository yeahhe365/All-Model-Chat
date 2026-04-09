
import { useState, useEffect } from 'react';
import { convertHtmlToMarkdown } from '../../utils/htmlToMarkdown';

interface UseSelectionPositionProps {
    containerRef: React.RefObject<HTMLElement>;
    isAudioActive: boolean;
}

export const useSelectionPosition = ({ containerRef, isAudioActive }: UseSelectionPositionProps) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [selectionBounds, setSelectionBounds] = useState<DOMRect | null>(null);

    // Monitor selection changes
    useEffect(() => {
        const handleSelectionChange = () => {
            if (isAudioActive) return;

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) {
                setPosition(null);
                setSelectionBounds(null);
                setSelectedText('');
                return;
            }

            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;
            
            // Context checks
            const containerEl = containerRef.current;
            if (containerEl && !containerEl.contains(commonAncestor)) {
                setPosition(null);
                setSelectionBounds(null);
                return;
            }

            const targetElement = commonAncestor.nodeType === 1 ? commonAncestor as HTMLElement : commonAncestor.parentElement;
            if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA')) {
                setPosition(null);
                setSelectionBounds(null);
                return;
            }

            // Extract content
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            const html = container.innerHTML;
            const text = convertHtmlToMarkdown(html).trim();

            if (!text) {
                setPosition(null);
                setSelectionBounds(null);
                setSelectedText('');
                return;
            }

            const rect = range.getBoundingClientRect();
            setSelectionBounds(rect);
            
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

    const clearSelection = () => {
        window.getSelection()?.removeAllRanges();
        setPosition(null);
        setSelectionBounds(null);
    };

    return { position, setPosition, selectedText, clearSelection, selectionBounds };
};
