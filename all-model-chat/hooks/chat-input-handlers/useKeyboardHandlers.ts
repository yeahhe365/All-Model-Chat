
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
}: UseKeyboardHandlersProps) => {

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isComposingRef.current) return;

        if (slashCommandState.isOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashCommandState((prev: any) => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % prev.filteredCommands.length, }));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashCommandState((prev: any) => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + prev.filteredCommands.length) % prev.filteredCommands.length, }));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleCommandSelect(slashCommandState.filteredCommands[slashCommandState.selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSlashCommandState((prev: any) => ({ ...prev, isOpen: false }));
            }
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey && (!isMobile || isDesktop)) {
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
        } else if (e.key === 'Escape' && isFullscreen) {
            e.preventDefault();
            handleToggleFullscreen();
        }
    }, [isComposingRef, slashCommandState, setSlashCommandState, handleCommandSelect, isMobile, isDesktop, inputText, handleSlashCommandExecution, canSend, handleSubmit, isFullscreen, handleToggleFullscreen]);

    return { handleKeyDown };
};
