import React, { useRef, useLayoutEffect } from 'react';
import { ClipboardCopy, Lightbulb, ListCollapse, Languages } from 'lucide-react';
import { translations } from '../../utils/appUtils';

type ActionType = 'explain' | 'summarize' | 'translate';

interface SelectionToolbarProps {
    position: { x: number; y: number };
    selectedText: string;
    onAction: (action: ActionType) => void;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ position, selectedText, onAction, t }) => {
    const toolbarRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (toolbarRef.current) {
            // Nudge the toolbar to be centered below the selection
            toolbarRef.current.style.transform = `translate(-50%, 10px)`;
        }
    }, [position]);

    const handleCopy = () => {
        navigator.clipboard.writeText(selectedText);
    };

    return (
        <div
            ref={toolbarRef}
            className="absolute z-30 flex items-center gap-1 p-1 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-full shadow-lg"
            style={{ top: position.y, left: position.x, animation: 'fadeInUp 0.15s ease-out both' }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent closing immediately on click
            onClick={(e) => e.stopPropagation()}
            aria-label="Text selection actions"
            role="toolbar"
        >
            <button onClick={handleCopy} title={t('selection_copy')} className="toolbar-button"><ClipboardCopy size={16} /></button>
            <div className="h-4 w-px bg-[var(--theme-border-secondary)]"></div>
            <button onClick={() => onAction('explain')} title={t('selection_explain')} className="toolbar-button"><Lightbulb size={16} /></button>
            <button onClick={() => onAction('summarize')} title={t('selection_summarize')} className="toolbar-button"><ListCollapse size={16} /></button>
            <button onClick={() => onAction('translate')} title={t('selection_translate')} className="toolbar-button"><Languages size={16} /></button>
        </div>
    );
};
