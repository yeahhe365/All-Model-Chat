import { useEffect, useRef, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import type { AppSettings, InputCommand } from '@/types';
import { isShortcutPressed } from '@/utils/shortcutUtils';

interface UseChatInputGlobalEffectsParams {
  appSettings: AppSettings;
  commandedInput: InputCommand | null;
  isAnyModalOpen: boolean;
  isProcessingFile: boolean;
  isAddingById: boolean;
  selectedFileCount: number;
  targetDocument: Document;
  textareaRef: RefObject<HTMLTextAreaElement>;
  prevIsProcessingFileRef: MutableRefObject<boolean>;
  justInitiatedFileOpRef: MutableRefObject<boolean>;
  setInputText: Dispatch<SetStateAction<string>>;
  setQuotes: Dispatch<SetStateAction<string[]>>;
  insertText: (text: string) => void;
  handlePasteAction: (
    clipboardData: DataTransfer | null,
    options?: { forceTextInsertion?: boolean },
  ) => Promise<boolean>;
}

export const useChatInputGlobalEffects = ({
  appSettings,
  commandedInput,
  isAnyModalOpen,
  isProcessingFile,
  isAddingById,
  selectedFileCount,
  targetDocument,
  textareaRef,
  prevIsProcessingFileRef,
  justInitiatedFileOpRef,
  setInputText,
  setQuotes,
  insertText,
  handlePasteAction,
}: UseChatInputGlobalEffectsParams) => {
  useEffect(() => {
    if (!commandedInput) {
      return;
    }

    if (commandedInput.mode === 'quote') {
      setQuotes((prev) => [...prev, commandedInput.text]);
    } else if (commandedInput.mode === 'append') {
      setInputText((prev) => prev + (prev ? '\n' : '') + commandedInput.text);
    } else if (commandedInput.mode === 'insert') {
      insertText(commandedInput.text);
    } else {
      setInputText(commandedInput.text);
    }

    if (commandedInput.mode === 'insert') {
      return;
    }

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      const textLength = textarea.value.length;
      textarea.setSelectionRange(textLength, textLength);
      textarea.scrollTop = textarea.scrollHeight;
    }, 0);
  }, [commandedInput, insertText, setInputText, setQuotes, textareaRef]);

  useEffect(() => {
    if (prevIsProcessingFileRef.current && !isProcessingFile && !isAddingById) {
      textareaRef.current?.focus();
      justInitiatedFileOpRef.current = false;
    }
    prevIsProcessingFileRef.current = isProcessingFile;
  }, [isAddingById, isProcessingFile, justInitiatedFileOpRef, prevIsProcessingFileRef, textareaRef]);

  useEffect(() => {
    const handleGlobalPaste = async (event: ClipboardEvent) => {
      if (isAnyModalOpen) {
        return;
      }

      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) {
        return;
      }

      const didHandle = await handlePasteAction(event.clipboardData, { forceTextInsertion: true });

      if (!didHandle) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      setTimeout(() => {
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
        textarea.scrollTop = textarea.scrollHeight;
      }, 0);
    };

    targetDocument.addEventListener('paste', handleGlobalPaste);
    return () => targetDocument.removeEventListener('paste', handleGlobalPaste);
  }, [handlePasteAction, isAnyModalOpen, targetDocument, textareaRef]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isAnyModalOpen) {
        return;
      }

      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isShortcutPressed(event, 'input.clearDraft', appSettings)) {
        if (isInput && target !== textareaRef.current) {
          return;
        }
        event.preventDefault();
        setInputText('');
        textareaRef.current?.focus();
        return;
      }

      if (isInput || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      event.preventDefault();
      textarea.focus();
      setInputText((prev) => prev + event.key);
      setTimeout(() => {
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
        textarea.scrollTop = textarea.scrollHeight;
      }, 0);
    };

    targetDocument.addEventListener('keydown', handleGlobalKeyDown);
    return () => targetDocument.removeEventListener('keydown', handleGlobalKeyDown);
  }, [appSettings, isAnyModalOpen, setInputText, targetDocument, textareaRef]);

  const prevFileCountRef = useRef(selectedFileCount);
  useEffect(() => {
    if (selectedFileCount > prevFileCountRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }

    prevFileCountRef.current = selectedFileCount;
  }, [selectedFileCount, textareaRef]);
};
