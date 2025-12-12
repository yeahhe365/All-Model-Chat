
import React, { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TextSelectionToolbarProps {
    onQuote: (text: string) => void;
    containerRef: React.RefObject<HTMLElement>;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({ onQuote, containerRef }) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) {
                setPosition(null);
                setSelectedText('');
                return;
            }

            const text = selection.toString().trim();
            if (!text) {
                setPosition(null);
                setSelectedText('');
                return;
            }

            // Check if selection is within the container
            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;
            
            // Handle valid container context
            const containerEl = containerRef.current;
            if (containerEl && !containerEl.contains(commonAncestor)) {
                setPosition(null);
                return;
            }

            // Avoid showing inside inputs/textareas
            const targetElement = commonAncestor.nodeType === 1 ? commonAncestor as HTMLElement : commonAncestor.parentElement;
            if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA')) {
                setPosition(null);
                return;
            }

            const rect = range.getBoundingClientRect();
            
            // Calculate position (centered above selection)
            setPosition({
                top: rect.top - 40, // 40px above
                left: rect.left + (rect.width / 2)
            });
            setSelectedText(text);
        };

        // Use document events to catch selection changes globally but filter inside handler
        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('mouseup', handleSelectionChange);
        document.addEventListener('keyup', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('mouseup', handleSelectionChange);
            document.removeEventListener('keyup', handleSelectionChange);
        };
    }, [containerRef]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent losing selection
        onQuote(selectedText);
        // Clear selection
        window.getSelection()?.removeAllRanges();
        setPosition(null);
    };

    if (!position) return null;

    return createPortal(
        <div 
            className="fixed z-[9999] flex items-center justify-center pointer-events-auto animate-in fade-in zoom-in duration-200"
            style={{ 
                top: position.top, 
                left: position.left, 
                transform: 'translateX(-50%)' 
            }}
        >
            <button
                onMouseDown={handleMouseDown}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-xs font-medium rounded-full shadow-lg hover:bg-[var(--theme-bg-tertiary)] hover:scale-105 transition-all active:scale-95"
            >
                <Quote size={14} className="text-[var(--theme-text-link)]" />
                <span>Quote</span>
            </button>
        </div>,
        document.body
    );
};
