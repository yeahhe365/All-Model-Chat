
import { useCallback } from 'react';
import { Command } from '../../components/chat/input/SlashCommandMenu';
import { AppSettings } from '../../types';
import { checkShortcut } from '../../utils/shortcutUtils';

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
    appSettings: AppSettings;
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
    appSettings
}: UseKeyboardHandlersProps) => {

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const shortcuts = appSettings.customShortcuts;
        if (!shortcuts) return; // Should not happen with default initialization

        // 1. Slash Menu Navigation (Highest Priority for Arrows/Enter when Open)
        // Note: We use explicit key checks here because these are UI navigation behaviors, not general app shortcuts.
        // Users expect ArrowDown to move down in a list, changing this might break basic UX expectations.
        // However, we could technically allow mapping 'Select' to something else.
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
        }

        // 2. Composition Guard
        if (isComposingRef.current) return;

        // 3. Hierarchical Logic (Esc usually)
        // Stop Generation
        if (isLoading && checkShortcut(e.nativeEvent, shortcuts.stopGeneration)) {
            e.preventDefault();
            onStopGenerating();
            return;
        }

        // Cancel Edit
        if (isEditing && checkShortcut(e.nativeEvent, shortcuts.cancelEdit)) {
            e.preventDefault();
            onCancelEdit();
            return;
        }

        // Close Slash Menu or Exit Fullscreen (Esc logic)
        // Since Esc is mapped to multiple things, we check priority or allow collision if user mapped them same
        if (checkShortcut(e.nativeEvent, shortcuts.stopGeneration)) { // Assuming cancelEdit/stopGeneration default is Esc
             if (slashCommandState.isOpen) {
                 e.preventDefault();
                 setSlashCommandState((prev: any) => ({ ...prev, isOpen: false }));
                 return;
             }
             if (isFullscreen && checkShortcut(e.nativeEvent, shortcuts.toggleFullscreen)) { // Handle collision if user mapped toggleFullscreen to Esc (rare)
                 // Handled below if mapped
             }
        }

        if (isFullscreen && checkShortcut(e.nativeEvent, shortcuts.toggleFullscreen)) {
             e.preventDefault();
             handleToggleFullscreen();
             return;
        }


        // 4. Edit Last User Message (ArrowUp when empty)
        if (inputText.length === 0 && !isLoading && checkShortcut(e.nativeEvent, shortcuts.editLastMessage)) {
            e.preventDefault();
            onEditLastUserMessage();
            return;
        }

        // 5. Standard Message Submission
        // "sendMessage" (Enter) vs "newLine" (Shift+Enter)
        // We prioritize New Line check first if it's a specific combo involving modifiers
        if (checkShortcut(e.nativeEvent, shortcuts.newLine)) {
            // Allow default behavior (insert new line)
            return;
        }

        if (checkShortcut(e.nativeEvent, shortcuts.sendMessage) && (!isMobile || isDesktop)) {
            const trimmedInput = inputText.trim();
            // Slash command trigger logic
            // Note: slash command trigger itself is handled by input change, but executing via Enter is standard
            if (trimmedInput.startsWith('/')) {
                e.preventDefault();
                handleSlashCommandExecution(trimmedInput);
                return;
            }
            if (canSend) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
            }
            return;
        }
        
    }, [isComposingRef, slashCommandState, setSlashCommandState, handleCommandSelect, isMobile, isDesktop, inputText, handleSlashCommandExecution, canSend, handleSubmit, isFullscreen, handleToggleFullscreen, isLoading, onStopGenerating, isEditing, onCancelEdit, onEditLastUserMessage, appSettings.customShortcuts]);

    return { handleKeyDown };
};
