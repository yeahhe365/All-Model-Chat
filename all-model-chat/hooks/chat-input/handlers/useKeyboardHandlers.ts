import { useCallback } from 'react';
import { Command } from '../../../components/chat/input/SlashCommandMenu';
import { AppSettings } from '../../../types';
import { isShortcutPressed } from '../../../utils/shortcutUtils';

interface UseKeyboardHandlersProps {
    appSettings: AppSettings;
    isComposingRef: React.MutableRefObject<boolean>;
    slashCommandState: { isOpen: boolean; filteredCommands: Command[]; selectedIndex: number; };
    setSlashCommandState: React.Dispatch<React.SetStateAction<any>>;
    handleCommandSelect: (command: Command) => void;
    inputText: string;
    setInputText: React.Dispatch<React.SetStateAction<string>>;
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
    appSettings,
    isComposingRef,
    slashCommandState,
    setSlashCommandState,
    handleCommandSelect,
    inputText,
    setInputText,
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
        if (slashCommandState.isOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashCommandState((prev: any) => {
                    const len = prev.filteredCommands?.length || 0;
                    if (len === 0) return prev;
                    return { ...prev, selectedIndex: (prev.selectedIndex + 1) % len };
                });
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashCommandState((prev: any) => {
                    const len = prev.filteredCommands?.length || 0;
                    if (len === 0) return prev;
                    return { ...prev, selectedIndex: (prev.selectedIndex - 1 + len) % len };
                });
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const command = slashCommandState.filteredCommands[slashCommandState.selectedIndex];
                if (command) handleCommandSelect(command);
                return;
            }
        }

        // 2. Composition Guard
        if (isComposingRef.current) return;

        // 3. Stop / Cancel (Custom Shortcut or default Escape)
        if (isShortcutPressed(e, 'global.stopCancel', appSettings)) {
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
            // Close Slash Menu
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
            // Fallthrough to allow other Escape handlers (like modal close) if not captured above
        }

        // 4. Edit Last User Message
        if (isShortcutPressed(e, 'input.editLast', appSettings) && !isLoading && inputText.length === 0) {
            e.preventDefault();
            onEditLastUserMessage();
            return;
        }

        // 5. Slash Commands Trigger
        if (isShortcutPressed(e, 'input.slashCommands', appSettings)) {
            // If the user types '/' (or whatever custom key)
            // Just let it pass through to `onChange` to trigger menu logic, unless it's a modifier combo?
            // Usually slash commands are typed. If user mapped it to 'Ctrl+/', we might need to manually insert '/'
            // For now, assume standard typing handles opening.
        }

        // 6. Send Message vs New Line
        const isSendPressed = isShortcutPressed(e, 'input.sendMessage', appSettings);
        const isNewLinePressed = isShortcutPressed(e, 'input.newLine', appSettings);

        // Priority resolution: if both match (unlikely/bad config), prefer Send?
        if (isSendPressed) {
            // If on mobile (without desktop override), we might want to respect soft keyboard behavior?
            // But if user set a shortcut, we should honor it.
            
            // Allow Slash Command execution on Send
            const trimmedInput = inputText.trim();
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

        if (isNewLinePressed) {
            // If native behavior (Enter) isn't triggered, we need to insert manually?
            // If mapped to Shift+Enter (default), browser handles newline in textarea naturally.
            // If mapped to something else (e.g. Ctrl+Enter for newline, Enter for send), browser might not do it.
            // We need to manually insert '\n' if the key isn't naturally producing it.
            // Simplified: Always insert '\n' manually if this shortcut is hit, unless it's just 'Enter' without mods.
            
            // Check if it's a standard typing key (Enter)
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                // Native behavior works.
                return;
            }
            
            // If it's a combo, perform manual insertion
             e.preventDefault();
             const target = e.target as HTMLTextAreaElement;
             const start = target.selectionStart;
             const end = target.selectionEnd;
             const value = target.value;
             const newValue = value.substring(0, start) + "\n" + value.substring(end);
             setInputText(newValue);
             
             // Restore cursor next frame
             requestAnimationFrame(() => {
                 target.selectionStart = target.selectionEnd = start + 1;
                 target.scrollTop = target.scrollHeight; // Auto scroll to bottom
             });
             return;
        }

    }, [
        appSettings,
        isComposingRef,
        slashCommandState,
        setSlashCommandState,
        handleCommandSelect,
        inputText,
        setInputText,
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
        onEditLastUserMessage
    ]);

    return { handleKeyDown };
};