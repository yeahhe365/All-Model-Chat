import { useState, useRef } from 'react';
import { AttachmentAction } from '../components/chat/input/AttachmentMenu';

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
  const [showCamera, setShowCamera] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentAction = (action: AttachmentAction) => {
    switch (action) {
      case 'upload': fileInputRef.current?.click(); break;
      case 'gallery': imageInputRef.current?.click(); break;
      case 'video': videoInputRef.current?.click(); break;
      case 'camera': setShowCamera(true); break;
      case 'recorder': setShowRecorder(true); break;
      case 'id': setShowAddByIdInput(true); break;
      case 'text': setShowCreateTextFileEditor(true); break;
    }
  };

  const handleConfirmCreateTextFile = async (content: string, filename: string) => {
    justInitiatedFileOpRef.current = true;
    const sanitizeFilename = (name: string): string => {
      let saneName = name.trim().replace(/[<>:"/\\|?*]+/g, '_');
      if (!saneName.toLowerCase().endsWith('.txt')) saneName += '.txt';
      return saneName;
    };
    const finalFilename = filename.trim() ? sanitizeFilename(filename) : `custom-text-${Date.now()}.txt`;
    const newFile = new File([content], finalFilename, { type: "text/plain" });
    await onProcessFiles([newFile]);
    setShowCreateTextFileEditor(false);
  };

  const handlePhotoCapture = (file: File) => {
    justInitiatedFileOpRef.current = true;
    onProcessFiles([file]);
    setShowCamera(false);
    textareaRef.current?.focus();
  };

  const handleAudioRecord = async (file: File) => {
    justInitiatedFileOpRef.current = true;
    await onProcessFiles([file]);
    setShowRecorder(false);
    textareaRef.current?.focus();
  };

  return {
    showCreateTextFileEditor,
    setShowCreateTextFileEditor,
    showCamera,
    setShowCamera,
    showRecorder,
    setShowRecorder,
    showAddByIdInput,
    setShowAddByIdInput,
    isHelpModalOpen,
    setIsHelpModalOpen,
    fileInputRef,
    imageInputRef,
    videoInputRef,
    handleAttachmentAction,
    handleConfirmCreateTextFile,
    handlePhotoCapture,
    handleAudioRecord,
  };
};