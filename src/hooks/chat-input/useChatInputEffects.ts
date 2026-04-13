import { useEffect, useRef } from 'react';
import { InputCommand, UploadedFile, AppSettings } from '../../types';
import { useTextAreaInsert } from '../useTextAreaInsert';
import { isShortcutPressed } from '../../utils/shortcutUtils';

interface UseChatInputEffectsProps {
  commandedInput: InputCommand | null;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  setQuotes: React.Dispatch<React.SetStateAction<string[]>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  prevIsProcessingFileRef: React.MutableRefObject<boolean>;
  isProcessingFile: boolean;
  isAddingById: boolean;
  justInitiatedFileOpRef: React.MutableRefObject<boolean>;
  selectedFiles: UploadedFile[];
  isModalOpen: boolean;
  handlePasteAction: (
    clipboardData: DataTransfer | null,
    options?: { forceTextInsertion?: boolean },
  ) => Promise<boolean>;
  appSettings: AppSettings;
}

export const useChatInputEffects = ({
  commandedInput,
  setInputText,
  setQuotes,
  textareaRef,
  prevIsProcessingFileRef,
  isProcessingFile,
  isAddingById,
  justInitiatedFileOpRef,
  selectedFiles,
  isModalOpen,
  handlePasteAction,
  appSettings,
}: UseChatInputEffectsProps) => {
  const insertText = useTextAreaInsert(textareaRef, setInputText);

  // 1. Handle Commanded Input
  useEffect(() => {
    if (commandedInput) {
      if (commandedInput.mode === 'quote') {
        setQuotes((prev) => [...prev, commandedInput.text]);
      } else if (commandedInput.mode === 'append') {
        setInputText((prev) => prev + (prev ? '\n' : '') + commandedInput.text);
      } else if (commandedInput.mode === 'insert') {
        insertText(commandedInput.text);
      } else {
        setInputText(commandedInput.text);
      }

      if (commandedInput.mode !== 'insert') {
        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.focus();
            const textLength = textarea.value.length;
            textarea.setSelectionRange(textLength, textLength);
          }
        }, 0);
      }
    }
  }, [commandedInput, setInputText, setQuotes, textareaRef, insertText]);

  // 2. Restore Focus after File Processing
  useEffect(() => {
    if (prevIsProcessingFileRef.current && !isProcessingFile && !isAddingById) {
      textareaRef.current?.focus();
      justInitiatedFileOpRef.current = false;
    }
    prevIsProcessingFileRef.current = isProcessingFile;
  }, [isProcessingFile, isAddingById, justInitiatedFileOpRef, prevIsProcessingFileRef, textareaRef]);

  // 3. Global Paste Handler
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (isModalOpen) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) return;

      const didHandle = await handlePasteAction(e.clipboardData, { forceTextInsertion: true });

      if (didHandle) {
        e.preventDefault();
        e.stopPropagation();

        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          setTimeout(() => {
            const len = textarea.value.length;
            textarea.setSelectionRange(len, len);
            textarea.scrollTop = textarea.scrollHeight;
          }, 0);
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [handlePasteAction, textareaRef, isModalOpen]);

  // 4. Global Keydown Handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;

      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isShortcutPressed(e as any, 'input.clearDraft', appSettings)) {
        if (isInput && target !== textareaRef.current) return;
        e.preventDefault();
        setInputText('');
        textareaRef.current?.focus();
        return;
      }

      if (isInput) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key.length === 1) {
        const textarea = textareaRef.current;
        if (textarea) {
          e.preventDefault();
          textarea.focus();
          setInputText((prev) => prev + e.key);
          setTimeout(() => {
            const len = textarea.value.length;
            textarea.setSelectionRange(len, len);
            textarea.scrollTop = textarea.scrollHeight;
          }, 0);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isModalOpen, textareaRef, setInputText, appSettings]);

  // 5. Auto-focus on File Add
  const prevFileCountRef = useRef(selectedFiles.length);
  useEffect(() => {
    if (selectedFiles.length > prevFileCountRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
    prevFileCountRef.current = selectedFiles.length;
  }, [selectedFiles.length, textareaRef]);
};
