import { useCallback, useMemo, useRef, useState } from 'react';
import type React from 'react';

import type { UploadedFile } from '../../types';
import { EXTENSION_TO_MIME } from '../../constants/fileConstants';
import { isTextFile } from '../../utils/fileHelpers';
import { useFileModalState } from '../ui/useFileModalState';

interface UseChatInputFileUiOptions {
  selectedFiles: UploadedFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onScreenshot: () => Promise<void>;
  justInitiatedFileOpRef: React.MutableRefObject<boolean>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const useChatInputFileUi = ({
  selectedFiles,
  setSelectedFiles,
  onProcessFiles,
  onScreenshot,
  justInitiatedFileOpRef,
  textareaRef,
}: UseChatInputFileUiOptions) => {
  const [showCreateTextFileEditor, setShowCreateTextFileEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [showAddByUrlInput, setShowAddByUrlInput] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [showTtsContextEditor, setShowTtsContextEditor] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  const {
    previewFile,
    closePreview,
    allImages: inputImages,
    currentImageIndex,
    handlePrevImage,
    handleNextImage,
    configuringFile,
    setConfiguringFile,
    openPreview,
    openConfiguration,
    isPreviewEditable,
  } = useFileModalState<UploadedFile>(selectedFiles);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentAction = useCallback(
    (action: 'upload' | 'gallery' | 'folder' | 'zip' | 'camera' | 'recorder' | 'id' | 'url' | 'text' | 'screenshot') => {
      setShowAddByIdInput(false);
      setShowAddByUrlInput(false);

      switch (action) {
        case 'upload':
          fileInputRef.current?.click();
          break;
        case 'gallery':
          imageInputRef.current?.click();
          break;
        case 'folder':
          folderInputRef.current?.click();
          break;
        case 'zip':
          zipInputRef.current?.click();
          break;
        case 'camera':
          cameraInputRef.current?.click();
          break;
        case 'recorder':
          setShowRecorder(true);
          break;
        case 'id':
          setShowAddByIdInput(true);
          break;
        case 'url':
          setShowAddByUrlInput(true);
          break;
        case 'text':
          setEditingFile(null);
          setShowCreateTextFileEditor(true);
          break;
        case 'screenshot':
          void onScreenshot();
          break;
      }
    },
    [onScreenshot],
  );

  const handleConfirmCreateTextFile = useCallback(
    async (content: string | Blob, filename: string) => {
      justInitiatedFileOpRef.current = true;

      const sanitizeFilename = (name: string) => name.trim().replace(/[<>:\"/\\\\|?*]+/g, '_');

      let finalFilename = filename.trim() ? sanitizeFilename(filename) : `file-${Date.now()}.txt`;

      if (!finalFilename.includes('.')) {
        finalFilename += '.md';
      }

      const extension = `.${finalFilename.split('.').pop()?.toLowerCase()}`;
      const mimeType = EXTENSION_TO_MIME[extension] || 'text/plain';
      const newFile = new File([content], finalFilename, { type: mimeType });

      setShowCreateTextFileEditor(false);
      setEditingFile(null);
      await onProcessFiles([newFile]);
    },
    [justInitiatedFileOpRef, onProcessFiles],
  );

  const handleAudioRecord = useCallback(
    async (file: File) => {
      justInitiatedFileOpRef.current = true;
      setShowRecorder(false);
      await onProcessFiles([file]);
      textareaRef.current?.focus();
    },
    [justInitiatedFileOpRef, onProcessFiles, textareaRef],
  );

  const handleEditFile = useCallback((file: UploadedFile) => {
    setEditingFile(file);
    setShowCreateTextFileEditor(true);
  }, []);

  const handleSaveTextFile = useCallback(
    async (content: string | Blob, filename: string) => {
      if (editingFile) {
        const size = content instanceof Blob ? content.size : content.length;
        const type = content instanceof Blob ? content.type : 'text/markdown';

        setSelectedFiles((prev) =>
          prev.map((file) =>
            file.id === editingFile.id
              ? {
                  ...file,
                  name: filename.includes('.') ? filename : `${filename}.md`,
                  textContent: typeof content === 'string' ? content : undefined,
                  size,
                  rawFile: new File([content], filename, { type }),
                  dataUrl: content instanceof Blob ? URL.createObjectURL(content) : file.dataUrl,
                }
              : file,
          ),
        );
        setShowCreateTextFileEditor(false);
        setEditingFile(null);
        return;
      }

      await handleConfirmCreateTextFile(content, filename);
    },
    [editingFile, handleConfirmCreateTextFile, setSelectedFiles],
  );

  const handleSavePreviewTextFile = useCallback(
    (fileId: string, content: string, newName: string) => {
      setSelectedFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? {
                ...file,
                name: newName,
                textContent: content,
                size: content.length,
                dataUrl: URL.createObjectURL(new File([content], newName, { type: 'text/plain' })),
                rawFile: new File([content], newName, { type: 'text/plain' }),
              }
            : file,
        ),
      );
    },
    [setSelectedFiles],
  );

  const handleConfigureFile = useCallback(
    (file: UploadedFile) => {
      if (isTextFile(file)) {
        openPreview(file, { editable: true });
        return;
      }

      openConfiguration(file);
    },
    [openConfiguration, openPreview],
  );

  const handlePreviewFile = useCallback((file: UploadedFile) => {
    openPreview(file);
  }, [openPreview]);

  const modalsState = useMemo(
    () => ({
      showCreateTextFileEditor,
      setShowCreateTextFileEditor,
      editingFile,
      setEditingFile,
      showRecorder,
      setShowRecorder,
      showAddByIdInput,
      setShowAddByIdInput,
      showAddByUrlInput,
      setShowAddByUrlInput,
      isHelpModalOpen,
      setIsHelpModalOpen,
      showTtsContextEditor,
      setShowTtsContextEditor,
      fileInputRef,
      imageInputRef,
      folderInputRef,
      zipInputRef,
      cameraInputRef,
      handleAttachmentAction,
      handleConfirmCreateTextFile,
      handleAudioRecord,
      handleEditFile,
    }),
    [
      editingFile,
      handleAttachmentAction,
      handleAudioRecord,
      handleConfirmCreateTextFile,
      handleEditFile,
      isHelpModalOpen,
      showAddByIdInput,
      showAddByUrlInput,
      showCreateTextFileEditor,
      showRecorder,
      showTtsContextEditor,
    ],
  );

  const localFileState = useMemo(
    () => ({
      configuringFile,
      setConfiguringFile,
      previewFile,
      closePreviewFile: closePreview,
      isPreviewEditable,
      isConverting,
      setIsConverting,
      showTokenModal,
      setShowTokenModal,
      handleSaveTextFile,
      handleSavePreviewTextFile,
      handleConfigureFile,
      handlePreviewFile,
      handlePrevImage,
      handleNextImage,
      inputImages,
      currentImageIndex,
    }),
    [
      closePreview,
      configuringFile,
      currentImageIndex,
      handleConfigureFile,
      handleNextImage,
      handlePreviewFile,
      handlePrevImage,
      handleSavePreviewTextFile,
      handleSaveTextFile,
      inputImages,
      isConverting,
      isPreviewEditable,
      previewFile,
      setConfiguringFile,
      showTokenModal,
    ],
  );

  return {
    modalsState,
    localFileState,
  };
};
