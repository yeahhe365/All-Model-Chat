import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { AppSettings } from '../../types';
import { isShortcutPressed } from '../../utils/shortcutUtils';
import type { SlashCommandState } from '../useSlashCommands';

interface ChatInputKeyboardState {
  inputText: string;
  isFullscreen: boolean;
  isMobile: boolean;
  isComposingRef: MutableRefObject<boolean>;
  setInputText: Dispatch<SetStateAction<string>>;
  handleToggleFullscreen: () => void;
}

interface UseChatInputKeyboardParams {
  appSettings: AppSettings;
  keyboardState: ChatInputKeyboardState;
  slashCommandState: {
    slashCommandState: SlashCommandState;
    setSlashCommandState: React.Dispatch<React.SetStateAction<SlashCommandState>>;
    handleInputChange: (value: string) => void;
    handleCommandSelect: (command: SlashCommandState['filteredCommands'][number]) => void;
    handleSlashCommandExecution: (rawInput: string) => boolean;
  };
  isLoading: boolean;
  isEditing: boolean;
  canSend: boolean;
  canQueueMessage: boolean;
  handleSubmit: (event: React.FormEvent) => void;
  queueCurrentSubmission: () => void;
  onStopGenerating: () => void;
  onCancelEdit: () => void;
  onEditLastUserMessage: () => void;
}

export const useChatInputKeyboard = ({
  appSettings,
  keyboardState,
  slashCommandState,
  isLoading,
  isEditing,
  canSend,
  canQueueMessage,
  handleSubmit,
  queueCurrentSubmission,
  onStopGenerating,
  onCancelEdit,
  onEditLastUserMessage,
}: UseChatInputKeyboardParams) => {
  const { inputText, isFullscreen, isMobile, isComposingRef, setInputText, handleToggleFullscreen } = keyboardState;

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      slashCommandState.handleInputChange(event.target.value);
    },
    [slashCommandState],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashCommandState.slashCommandState.isOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          slashCommandState.setSlashCommandState((prev: SlashCommandState) => {
            const length = prev.filteredCommands?.length || 0;
            if (length === 0) {
              return prev;
            }

            return { ...prev, selectedIndex: (prev.selectedIndex + 1) % length };
          });
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          slashCommandState.setSlashCommandState((prev: SlashCommandState) => {
            const length = prev.filteredCommands?.length || 0;
            if (length === 0) {
              return prev;
            }

            return {
              ...prev,
              selectedIndex: (prev.selectedIndex - 1 + length) % length,
            };
          });
          return;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const command =
            slashCommandState.slashCommandState.filteredCommands[slashCommandState.slashCommandState.selectedIndex];
          if (command) {
            slashCommandState.handleCommandSelect(command);
          }
          return;
        }
      }

      if (isComposingRef.current || event.nativeEvent.isComposing) {
        return;
      }

      if (isShortcutPressed(event, 'global.stopCancel', appSettings)) {
        if (isLoading) {
          event.preventDefault();
          onStopGenerating();
          return;
        }

        if (isEditing) {
          event.preventDefault();
          onCancelEdit();
          return;
        }

        if (slashCommandState.slashCommandState.isOpen) {
          event.preventDefault();
          slashCommandState.setSlashCommandState((prev: SlashCommandState) => ({ ...prev, isOpen: false }));
          return;
        }

        if (isFullscreen) {
          event.preventDefault();
          handleToggleFullscreen();
          return;
        }
      }

      if (isShortcutPressed(event, 'input.editLast', appSettings) && !isLoading && inputText.length === 0) {
        event.preventDefault();
        onEditLastUserMessage();
        return;
      }

      const isSendPressed = isShortcutPressed(event, 'input.sendMessage', appSettings);
      const isNewLinePressed = isShortcutPressed(event, 'input.newLine', appSettings);

      if (isSendPressed) {
        if (isMobile && event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
          return;
        }

        const rawInput = inputText;
        if (rawInput.startsWith('/')) {
          const handledSlashCommand = slashCommandState.handleSlashCommandExecution(rawInput);
          if (handledSlashCommand) {
            event.preventDefault();
            return;
          }
        }

        if (canSend) {
          event.preventDefault();
          handleSubmit(event as unknown as React.FormEvent);
          return;
        }

        if (canQueueMessage) {
          event.preventDefault();
          queueCurrentSubmission();
        }
        return;
      }

      if (!isNewLinePressed) {
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = `${value.substring(0, start)}\n${value.substring(end)}`;
      setInputText(newValue);

      requestAnimationFrame(() => {
        target.selectionStart = start + 1;
        target.selectionEnd = start + 1;
        target.scrollTop = target.scrollHeight;
      });
    },
    [
      appSettings,
      canQueueMessage,
      canSend,
      handleSubmit,
      handleToggleFullscreen,
      inputText,
      isComposingRef,
      isEditing,
      isFullscreen,
      isLoading,
      isMobile,
      onCancelEdit,
      onEditLastUserMessage,
      onStopGenerating,
      queueCurrentSubmission,
      setInputText,
      slashCommandState,
    ],
  );

  return {
    handleInputChange,
    handleKeyDown,
  };
};
