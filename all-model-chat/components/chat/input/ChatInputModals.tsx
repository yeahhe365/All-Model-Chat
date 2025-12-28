import React from 'react';
import { AudioRecorder } from '../../modals/AudioRecorder';
import { CreateTextFileEditor } from '../../modals/CreateTextFileEditor';
import { HelpModal } from '../../modals/HelpModal';
import { translations } from '../../../utils/appUtils';
import { CommandInfo } from '../../../types';

export interface ChatInputModalsProps {
  showRecorder: boolean;
  onAudioRecord: (file: File) => Promise<void>;
  onRecorderCancel: () => void;
  showCreateTextFileEditor: boolean;
  onConfirmCreateTextFile: (content: string, filename: string) => Promise<void>;
  onCreateTextFileCancel: () => void;
  isHelpModalOpen: boolean;
  onHelpModalClose: () => void;
  allCommandsForHelp: CommandInfo[];
  isProcessingFile: boolean;
  isLoading: boolean;
  t: (key: keyof typeof translations) => string;
  initialContent?: string;
  initialFilename?: string;
}

export const ChatInputModals: React.FC<ChatInputModalsProps> = ({
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
  initialContent,
  initialFilename,
}) => {
  if (!showRecorder && !showCreateTextFileEditor && !isHelpModalOpen) {
    return null;
  }

  return (
    <>
      {showRecorder && <AudioRecorder onRecord={onAudioRecord} onCancel={onRecorderCancel} />}
      {showCreateTextFileEditor && (
        <CreateTextFileEditor 
            onConfirm={onConfirmCreateTextFile} 
            onCancel={onCreateTextFileCancel} 
            isProcessing={isProcessingFile} 
            isLoading={isLoading} 
            t={t as (key: string) => string} 
            initialContent={initialContent}
            initialFilename={initialFilename}
        />
      )}
      {isHelpModalOpen && <HelpModal isOpen={isHelpModalOpen} onClose={onHelpModalClose} commands={allCommandsForHelp} t={t} />}
    </>
  );
};