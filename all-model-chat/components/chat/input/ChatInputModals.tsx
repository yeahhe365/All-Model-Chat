import React from 'react';
import { CameraCapture } from '../CameraCapture';
import { AudioRecorder } from '../AudioRecorder';
import { CreateTextFileEditor } from '../CreateTextFileEditor';
import { HelpModal } from './HelpModal';
import { translations } from '../../../utils/appUtils';
import { ChatInputModalsProps } from '../../../types';
import { ScreenshotEditor } from '../ScreenshotEditor';

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
  showScreenshotEditor,
  screenshotUrl,
  onConfirmScreenshot,
  onCancelScreenshot,
}) => {
  if (!showCamera && !showRecorder && !showCreateTextFileEditor && !isHelpModalOpen && !showScreenshotEditor) {
    return null;
  }

  return (
    <>
      {showCamera && <CameraCapture onCapture={onPhotoCapture} onCancel={onCameraCancel} />}
      {showRecorder && <AudioRecorder onRecord={onAudioRecord} onCancel={onRecorderCancel} />}
      {showCreateTextFileEditor && <CreateTextFileEditor onConfirm={onConfirmCreateTextFile} onCancel={onCreateTextFileCancel} isProcessing={isProcessingFile} isLoading={isLoading} />}
      {isHelpModalOpen && <HelpModal isOpen={isHelpModalOpen} onClose={onHelpModalClose} commands={allCommandsForHelp} t={t} />}
      {showScreenshotEditor && <ScreenshotEditor screenshotUrl={screenshotUrl} onConfirm={onConfirmScreenshot} onCancel={onCancelScreenshot} />}
    </>
  );
};