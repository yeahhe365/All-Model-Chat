import React from 'react';
import { useCreateFileEditor } from '@/hooks/useCreateFileEditor';
import { CreateFileHeader } from './create-file/CreateFileHeader';
import { CreateFileBody } from './create-file/CreateFileBody';
import { CreateFileFooter } from './create-file/CreateFileFooter';
import { TextEditorModalShell } from './TextEditorModalShell';

interface CreateTextFileEditorProps {
  onConfirm: (content: string | Blob, filename: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  isLoading: boolean;
  initialContent?: string;
  initialFilename?: string;
  themeId: string;
  isPasteRichTextAsMarkdownEnabled?: boolean;
}

export const CreateTextFileEditor: React.FC<CreateTextFileEditorProps> = (props) => {
  const {
    onConfirm,
    onCancel,
    isProcessing,
    isLoading,
    initialContent = '',
    initialFilename = '',
    themeId,
    isPasteRichTextAsMarkdownEnabled = true,
  } = props;

  const {
    textContent,
    setTextContent,
    debouncedContent,
    filenameBase,
    setFilenameBase,
    extension,
    setExtension,
    isPreviewMode,
    setIsPreviewMode,
    isExportingPdf,
    textareaRef,
    isEditing,
    isPdf,
    supportsRichPreview,
    handleSave,
    handleDownloadPdf,
    handlePaste,
    handleDrop,
  } = useCreateFileEditor({
    initialContent,
    initialFilename,
    onConfirm,
    themeId,
    isPasteRichTextAsMarkdownEnabled,
  });

  return (
    <TextEditorModalShell
      onClose={onCancel}
      contentClassName="w-full h-full max-w-none bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-none flex flex-col overflow-hidden"
      header={
        <CreateFileHeader
          isEditing={isEditing}
          isPdf={isPdf}
          isExportingPdf={isExportingPdf}
          supportsRichPreview={supportsRichPreview}
          isPreviewMode={isPreviewMode}
          setIsPreviewMode={setIsPreviewMode}
          handleDownloadPdf={handleDownloadPdf}
          onClose={onCancel}
        />
      }
      body={
        <CreateFileBody
          textContent={textContent}
          setTextContent={setTextContent}
          debouncedContent={debouncedContent}
          textareaRef={textareaRef}
          isPreviewMode={isPreviewMode}
          supportsRichPreview={supportsRichPreview}
          handlePaste={handlePaste}
          handleDrop={handleDrop}
          themeId={themeId}
        />
      }
      footer={
        <CreateFileFooter
          filenameBase={filenameBase}
          setFilenameBase={setFilenameBase}
          extension={extension}
          setExtension={setExtension}
          onSave={() => handleSave(isProcessing)}
          isEditing={isEditing}
          isProcessing={isProcessing}
          isLoading={isLoading}
          isExportingPdf={isExportingPdf}
          hasContent={!!textContent.trim()}
        />
      }
    />
  );
};
