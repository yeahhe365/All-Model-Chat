
import React from 'react';
import { Modal } from '../shared/Modal';
import { useCreateFileEditor } from '../../hooks/useCreateFileEditor';
import { CreateFileHeader } from './create-file/CreateFileHeader';
import { CreateFileBody } from './create-file/CreateFileBody';
import { CreateFileFooter } from './create-file/CreateFileFooter';

interface CreateTextFileEditorProps {
  onConfirm: (content: string | Blob, filename: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  isLoading: boolean;
  t: (key: string) => string;
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
    t,
    initialContent = '',
    initialFilename = '',
    themeId,
    isPasteRichTextAsMarkdownEnabled = true
  } = props;

  const {
    textContent, setTextContent,
    debouncedContent,
    filenameBase, setFilenameBase,
    extension, setExtension,
    isPreviewMode, setIsPreviewMode,
    isExportingPdf,
    textareaRef,
    printRef,
    isEditing,
    isPdf,
    supportsRichPreview,
    handleSave,
    handleDownloadPdf,
    handlePaste,
    handleDrop
  } = useCreateFileEditor({
      initialContent,
      initialFilename,
      onConfirm,
      themeId,
      isPasteRichTextAsMarkdownEnabled
  });

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      noPadding
      contentClassName="w-full h-full max-w-none bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-none flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <CreateFileHeader 
          isEditing={isEditing}
          isPdf={isPdf}
          isExportingPdf={isExportingPdf}
          supportsRichPreview={supportsRichPreview}
          isPreviewMode={isPreviewMode}
          setIsPreviewMode={setIsPreviewMode}
          handleDownloadPdf={handleDownloadPdf}
          onClose={onCancel}
          t={t}
      />

      <CreateFileBody 
          textContent={textContent}
          setTextContent={setTextContent}
          debouncedContent={debouncedContent}
          textareaRef={textareaRef}
          printRef={printRef}
          isPreviewMode={isPreviewMode}
          supportsRichPreview={supportsRichPreview}
          handlePaste={handlePaste}
          handleDrop={handleDrop}
          themeId={themeId}
          t={t}
      />

      <CreateFileFooter 
          filenameBase={filenameBase}
          setFilenameBase={setFilenameBase}
          extension={extension}
          setExtension={setExtension}
          onSave={() => handleSave(isProcessing)}
          isEditing={isEditing}
          isPdf={isPdf}
          isProcessing={isProcessing}
          isLoading={isLoading}
          isExportingPdf={isExportingPdf}
          hasContent={!!textContent.trim()}
          t={t}
      />
    </Modal>
  );
};
