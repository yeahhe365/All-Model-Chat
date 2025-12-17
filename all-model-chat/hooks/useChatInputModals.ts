import React, { useState, useRef } from 'react';
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
  const [showRecorder, setShowRecorder] = useState(false);
  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [showAddByUrlInput, setShowAddByUrlInput] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshot = async () => {
    if (!('getDisplayMedia' in navigator.mediaDevices)) {
        alert("Your browser does not support screen capture.");
        return;
    }

    let stream: MediaStream;
    try {
        // Cast to any to bypass strict type check for mediaSource property if necessary, or use compliant structure
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: { mediaSource: "screen" } as any, 
            audio: false,
        });
    } catch (err) {
        console.error("Error starting screen capture:", err);
        if ((err as DOMException).name !== 'NotAllowedError') {
            alert(`Could not start screen capture: ${(err as Error).message}`);
        }
        return;
    }
    
    const track = stream.getVideoTracks()[0];
    if (!track) {
        console.error("No video track found in the stream.");
        stream.getTracks().forEach(t => t.stop());
        return;
    }
    
    const processBlob = async (blob: Blob | null) => {
        if (blob) {
            const fileName = `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            justInitiatedFileOpRef.current = true;
            await onProcessFiles([file]);
        }
        stream.getTracks().forEach(t => t.stop());
    };

    try {
        // @ts-ignore - ImageCapture is not in all TS libs yet
        if (typeof ImageCapture !== 'undefined') {
             // @ts-ignore
            const imageCapture = new ImageCapture(track);
            const bitmap = await imageCapture.grabFrame();
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext('2d');
            context?.drawImage(bitmap, 0, 0);
            canvas.toBlob(processBlob, 'image/png');
        } else {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const context = canvas.getContext('2d');
                    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(processBlob, 'image/png');
                    video.remove();
                }, 150);
            };
        }
    } catch (err) {
        console.error("Error processing screen capture frame:", err);
        stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleAttachmentAction = (action: AttachmentAction) => {
    // Close other inputs when a new one is opened
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
      case 'text': setShowCreateTextFileEditor(true); break;
      case 'screenshot': handleScreenshot(); break;
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
    
    setShowCreateTextFileEditor(false);
    await onProcessFiles([newFile]);
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
    showRecorder,
    setShowRecorder,
    showAddByIdInput,
    setShowAddByIdInput,
    showAddByUrlInput,
    setShowAddByUrlInput,
    isHelpModalOpen,
    setIsHelpModalOpen,
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
    cameraInputRef,
    handleAttachmentAction,
    handleConfirmCreateTextFile,
    handleAudioRecord,
  };
};