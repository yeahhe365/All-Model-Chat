
import { useCallback } from 'react';
import { Command } from '../../components/chat/input/SlashCommandMenu';

interface UseKeyboardHandlersProps {
    isComposingRef: React.MutableRefObject<boolean>;
    slashCommandState: { isOpen: boolean; filteredCommands: Command[]; selectedIndex: number; };
    setSlashCommandState: React.Dispatch<React.SetStateAction<any>>;
    handleCommandSelect: (command: Command) => void;
    inputText: string;
    isMobile: boolean;
    isDesktop: boolean;
    handleSlashCommandExecution: (text: string) => void;
    canSend: boolean;
    handleSubmit: (e: React.FormEvent) => void;
    isFullscreen: boolean;
    handleToggleFullscreen: () => void;
    isLoading: boolean;
    onStopGenerating: () => void;
    isEditing: boolean;
    onCancelEdit: () => void;
    onEditLastUserMessage: () => void;
}

export const useKeyboardHandlers = ({
    isComposingRef,
    slashCommandState,
    setSlashCommandState,
    handleCommandSelect,
    inputText,
    isMobile,
    isDesktop,
    handleSlashCommandExecution,
    canSend,
    handleSubmit,
    isFullscreen,
    handleToggleFullscreen,
    isLoading,
    onStopGenerating,
    isEditing,
    onCancelEdit,
    onEditLastUserMessage,
}: UseKeyboardHandlersProps) => {

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // 1. Slash Menu Navigation (Highest Priority for Arrows/Enter when Open)
        // We handle this BEFORE composition check to ensure the menu is navigable even if
        // the browser thinks a composition is briefly active (common with some IMEs or fast typing).
        if (slashCommandState.isOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashCommandState((prev: any) => {
                    const len = prev.filteredCommands?.length || 0;
                    if (len === 0) return prev;
                    return { 
                        ...prev, 
                        selectedIndex: (prev.selectedIndex + 1) % len, 
                    };
                });
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashCommandState((prev: any) => {
                    const len = prev.filteredCommands?.length || 0;
                    if (len === 0) return prev;
                    return { 
                        ...prev, 
                        selectedIndex: (prev.selectedIndex - 1 + len) % len, 
                    };
                });
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const command = slashCommandState.filteredCommands[slashCommandState.selectedIndex];
                if (command) {
                    handleCommandSelect(command);
                }
                return;
            }
            // If other keys are pressed while menu is open, we let them fall through
            // (e.g. typing more letters to filter), unless it's Escape.
        }

        // 2. Composition Guard
        // If we are composing text (IME), ignore other shortcuts to avoid interrupting input.
        if (isComposingRef.current) return;

        // 3. Esc Hierarchical Logic
        if (e.key === 'Escape') {
            // Stop Generation
            if (isLoading) {
                e.preventDefault();
                onStopGenerating();
                return;
            }
            // Cancel Edit
            if (isEditing) {
                e.preventDefault();
                onCancelEdit();
                return;
            }
            // Close Slash Menu (Explicit close if not handled by blur/input change)
            if (slashCommandState.isOpen) {
                e.preventDefault();
                setSlashCommandState((prev: any) => ({ ...prev, isOpen: false }));
                return;
            }
            // Exit Fullscreen
            if (isFullscreen) {
                e.preventDefault();
                handleToggleFullscreen();
                return;
            }
            return;
        }

        // 4. Edit Last User Message (ArrowUp when empty)
        if (e.key === 'ArrowUp' && !isLoading && inputText.length === 0) {
            e.preventDefault();
            onEditLastUserMessage();
            return;
        }

        // 5. Standard Message Submission
        if (e.key === 'Enter' && !e.shiftKey && (!isMobile || isDesktop)) {
            const trimmedInput = inputText.trim();
            // Double check: If it looks like a command but menu wasn't open (edge case), try executing
            if (trimmedInput.startsWith('/')) {
                e.preventDefault();
                handleSlashCommandExecution(trimmedInput);
                return;
            }
            if (canSend) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
            }
        }
    }, [isComposingRef, slashCommandState, setSlashCommandState, handleCommandSelect, isMobile, isDesktop, inputText, handleSlashCommandExecution, canSend, handleSubmit, isFullscreen, handleToggleFullscreen, isLoading, onStopGenerating, isEditing, onCancelEdit, onEditLastUserMessage]);

    return { handleKeyDown };
};
