import { useCallback, type MutableRefObject, type RefObject } from 'react';
import type { AppSettings, UploadedFile } from '../../types';
import { processClipboardData } from '../../utils/clipboardUtils';

const YOUTUBE_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;

type SetSelectedFiles = (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;

interface UseChatInputClipboardParams {
  appSettings: AppSettings;
  isAddingById: boolean;
  showCreateTextFileEditor: boolean;
  showRecorder: boolean;
  justInitiatedFileOpRef: MutableRefObject<boolean>;
  textareaRef: RefObject<HTMLTextAreaElement>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  setUrlInput: (value: string) => void;
  setShowAddByUrlInput: (isOpen: boolean) => void;
  setSelectedFiles: SetSelectedFiles;
  setAppFileError: (error: string | null) => void;
  onProcessFiles: (files: File[]) => Promise<void>;
  insertText: (text: string) => void;
}

export const useChatInputClipboard = ({
  appSettings,
  isAddingById,
  showCreateTextFileEditor,
  showRecorder,
  justInitiatedFileOpRef,
  textareaRef,
  setInputText,
  setUrlInput,
  setShowAddByUrlInput,
  setSelectedFiles,
  setAppFileError,
  onProcessFiles,
  insertText,
}: UseChatInputClipboardParams) => {
  const handleAddUrl = useCallback(
    async (url: string) => {
      if (!YOUTUBE_URL_REGEX.test(url)) {
        setAppFileError('Invalid YouTube URL provided.');
        return;
      }

      justInitiatedFileOpRef.current = true;
      const newUrlFile: UploadedFile = {
        id: `url-${Date.now()}`,
        name: url.length > 30 ? `${url.substring(0, 27)}...` : url,
        type: 'video/youtube-link',
        size: 0,
        fileUri: url,
        uploadState: 'active',
        isProcessing: false,
      };

      setSelectedFiles((prev) => [...prev, newUrlFile]);
      setUrlInput('');
      setShowAddByUrlInput(false);
      textareaRef.current?.focus();
    },
    [justInitiatedFileOpRef, setAppFileError, setSelectedFiles, setShowAddByUrlInput, setUrlInput, textareaRef],
  );

  const handlePasteAction = useCallback(
    async (clipboardData: DataTransfer | null, options: { forceTextInsertion?: boolean } = {}): Promise<boolean> => {
      const inputModalOpen = showCreateTextFileEditor || showRecorder;

      if (isAddingById || inputModalOpen) {
        return false;
      }

      const result = processClipboardData(clipboardData, {
        isPasteRichTextAsMarkdownEnabled: appSettings.isPasteRichTextAsMarkdownEnabled ?? true,
        isPasteAsTextFileEnabled: appSettings.isPasteAsTextFileEnabled ?? true,
      });

      if (result.type === 'empty') {
        return false;
      }

      if (result.type === 'files' || result.type === 'large-text-file') {
        justInitiatedFileOpRef.current = true;
        await onProcessFiles(result.files);
        textareaRef.current?.focus();
        return true;
      }

      if (result.type === 'markdown') {
        insertText(result.content);
        return true;
      }

      if (result.type === 'text') {
        const pastedText = result.content;

        if (YOUTUBE_URL_REGEX.test(pastedText.trim())) {
          await handleAddUrl(pastedText.trim());
          return true;
        }

        if (options.forceTextInsertion) {
          insertText(pastedText);
          return true;
        }
      }

      return false;
    },
    [
      appSettings.isPasteAsTextFileEnabled,
      appSettings.isPasteRichTextAsMarkdownEnabled,
      handleAddUrl,
      insertText,
      isAddingById,
      justInitiatedFileOpRef,
      onProcessFiles,
      showCreateTextFileEditor,
      showRecorder,
      textareaRef,
    ],
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const didHandle = await handlePasteAction(event.clipboardData);
      if (didHandle) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [handlePasteAction],
  );

  const handlePasteFromClipboard = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        return;
      }

      setInputText((prev) => prev + clipboardText);
      setTimeout(() => {
        const textarea = textareaRef.current;
        textarea?.focus();
        textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
      }, 0);
    } catch {
      return;
    }
  }, [setInputText, textareaRef]);

  const handleClearInput = useCallback(() => {
    setInputText('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [setInputText, textareaRef]);

  return {
    handleAddUrl,
    handlePasteAction,
    handlePaste,
    handlePasteFromClipboard,
    handleClearInput,
  };
};
