
import { useCallback } from 'react';

export const useTextAreaInsert = (
    textareaRef: React.RefObject<HTMLTextAreaElement>,
    setInputText: React.Dispatch<React.SetStateAction<string>>
) => {
    const insertText = useCallback((text: string, options: { ensurePadding?: boolean } = {}) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            // Fallback: Append if no ref available
            setInputText(prev => prev + text);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;

        const before = currentValue.substring(0, start);
        const after = currentValue.substring(end);

        let finalText = text;
        
        if (options.ensurePadding) {
             let prefix = "";
             let suffix = "";
             // Add space before if not at start and previous char is not whitespace
             if (start > 0 && !/\s$/.test(before)) prefix = " ";
             // Add space after if not at end and next char is not whitespace
             if (after.length > 0 && !/^\s/.test(after)) suffix = " ";
             finalText = prefix + text + suffix;
        }

        const newValue = before + finalText + after;
        setInputText(newValue);

        // Restore cursor position and focus
        requestAnimationFrame(() => {
            textarea.focus();
            const newCursorPos = start + finalText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            // Scroll to cursor
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight || '20', 10);
            const scrollPos = textarea.scrollHeight; // Simple heuristics often suffice, or just focus.
            // Native focus usually scrolls into view.
        });
    }, [textareaRef, setInputText]);

    return insertText;
};
