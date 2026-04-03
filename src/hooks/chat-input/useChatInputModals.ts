
import React, { useState, useRef } from 'react';
import { AttachmentAction } from '../../components/chat/input/AttachmentMenu';
import { UploadedFile } from '../../types';
import { EXTENSION_TO_MIME } from '../../constants/fileConstants';
import { captureScreenImage } from '../../utils/mediaUtils';

interface UseChatInputModalsProps {
  onProcessFiles: (files: File[]) => Promise<void>;
  justInitiatedFileOpRef: React.MutableRefObject<boolean>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const useChatInputModals = ({
  onProcessFiles,
  justInitiatedFileOpRef,
  textareaRef,
}: UseChatInputModalsProps) => {
  const [showCreateTextFileEditor, setShowCreateTextFileEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [showAddByUrlInput, setShowAddByUrlInput] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [showTtsContextEditor, setShowTtsContextEditor] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshot = async () => {
    const blob = await captureScreenImage();
    
    if (blob) {
        const fileName = `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        justInitiatedFileOpRef.current = true;
        onProcessFiles([file]);
    }
  };

  const handleAttachmentAction = (action: AttachmentAction) => {
    setShowAddByIdInput(false);
    setShowAddByUrlInput(false);

    switch (action) {
      case 'upload': fileInputRef.current?.click(); break;
      case 'gallery': imageInputRef.current?.click(); break;
      case 'folder': folderInputRef.current?.click(); break;
      case 'zip': zipInputRef.current?.click(); break;
      case 'camera': cameraInputRef.current?.click(); break;
      case 'recorder': setShowRecorder(true); break;
      case 'id': setShowAddByIdInput(true); break;
      case 'url': setShowAddByUrlInput(true); break;
      case 'text': 
        setEditingFile(null);
        setShowCreateTextFileEditor(true); 
        break;
      case 'screenshot': handleScreenshot(); break;
    }
  };

  const handleConfirmCreateTextFile = async (content: string | Blob, filename: string) => {
    justInitiatedFileOpRef.current = true;
    
    const sanitizeFilename = (name: string): string => {
      return name.trim().replace(/[<>:"/\\|?*]+/g, '_');
    };
    
    let finalFilename = filename.trim() ? sanitizeFilename(filename) : `file-${Date.now()}.txt`;
    
    // Ensure extension if missing (fallback logic, though modal usually handles this)
    if (!finalFilename.includes('.')) {
        finalFilename += '.md';
    }

    const extension = `.${finalFilename.split('.').pop()?.toLowerCase()}`;
    // Determine mime type based on centralized constant
    const mimeType = EXTENSION_TO_MIME[extension] || 'text/plain';

    // If content is already a Blob (e.g. PDF), use it directly, otherwise treat as string
    const blobParts = [content];
    const newFile = new File(blobParts, finalFilename, { type: mimeType });
    
    setShowCreateTextFileEditor(false);
    setEditingFile(null);
    onProcessFiles([newFile]);
  };

  const handleAudioRecord = async (file: File) => {
    justInitiatedFileOpRef.current = true;
    setShowRecorder(false);
    onProcessFiles([file]); 
    textareaRef.current?.focus();
  };

  const handleEditFile = (file: UploadedFile) => {
      setEditingFile(file);
      setShowCreateTextFileEditor(true);
  };

  return {
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
  };
};