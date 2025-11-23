
import React from 'react';
import { CameraCapture } from '../CameraCapture';
import { AudioRecorder } from '../AudioRecorder';
import { CreateTextFileEditor } from '../CreateTextFileEditor';
import { HelpModal } from './HelpModal';
import { translations } from '../../../utils/appUtils';
import { ChatInputModalsProps } from '../../../types';

export const ChatInputModals: React.FC<ChatInputModalsProps> = ({
  showCamera,
  onPhotoCapture,
  onCameraCancel,
  showRecorder,
  onAudioRecord,
  onRecorderCancel,
  showCreateTextFileEditor,
  onConfirmCreateTextFile,
  onCreateTextFileCancel,
  isHelpModalOpen,
  onHelpModalClose,
  allCommandsForHelp,
  isProcessingFile,
  isLoading,
  t,
  isHistorySidebarOpen,
}) => {
  if (!showCamera && !showRecorder && !showCreateTextFileEditor && !isHelpModalOpen) {
    return null;
  }

  return (
    <>
      {showCamera && <CameraCapture onCapture={onPhotoCapture} onCancel={onCameraCancel} />}
      {showRecorder && <AudioRecorder onRecord={onAudioRecord} onCancel={onRecorderCancel} />}
      {showCreateTextFileEditor && <CreateTextFileEditor onConfirm={onConfirmCreateTextFile} onCancel={onCreateTextFileCancel} isProcessing={isProcessingFile} isLoading={isLoading} t={t as (key: string) => string} />}
      {isHelpModalOpen && <HelpModal isOpen={isHelpModalOpen} onClose={onHelpModalClose} commands={allCommandsForHelp} t={t} />}
    </>
  );
};
