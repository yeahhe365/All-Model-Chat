
import React, { Suspense, lazy } from 'react';
import { translations } from '../../../utils/appUtils';
import { CommandInfo, UploadedFile } from '../../../types';

const AudioRecorder = lazy(async () => {
  const module = await import('../../modals/AudioRecorder');
  return { default: module.AudioRecorder };
});

const CreateTextFileEditor = lazy(async () => {
  const module = await import('../../modals/CreateTextFileEditor');
  return { default: module.CreateTextFileEditor };
});

const HelpModal = lazy(async () => {
  const module = await import('../../modals/HelpModal');
  return { default: module.HelpModal };
});

const TextEditorModal = lazy(async () => {
  const module = await import('../../modals/TextEditorModal');
  return { default: module.TextEditorModal };
});

export interface ChatInputModalsProps {
  showRecorder: boolean;
  onAudioRecord: (file: File) => Promise<void>;
  onRecorderCancel: () => void;
  showCreateTextFileEditor: boolean;
  onConfirmCreateTextFile: (content: string | Blob, filename: string) => Promise<void>;
  onCreateTextFileCancel: () => void;
  isHelpModalOpen: boolean;
  onHelpModalClose: () => void;
  allCommandsForHelp: CommandInfo[];
  isProcessingFile: boolean;
  isLoading: boolean;
  t: (key: keyof typeof translations) => string;
  initialContent?: string;
  initialFilename?: string;
  editingFile?: UploadedFile | null;
  isSystemAudioRecordingEnabled?: boolean;
  themeId: string;
  isPasteRichTextAsMarkdownEnabled?: boolean;
  showTtsContextEditor?: boolean;
  onCloseTtsContextEditor?: () => void;
  ttsContext?: string;
  setTtsContext?: (val: string) => void;
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
  isSystemAudioRecordingEnabled,
  themeId,
  isPasteRichTextAsMarkdownEnabled,
  showTtsContextEditor,
  onCloseTtsContextEditor,
  ttsContext,
  setTtsContext
}) => {
  if (!showRecorder && !showCreateTextFileEditor && !isHelpModalOpen && !showTtsContextEditor) {
    return null;
  }

  const defaultTtsContextTemplate = t('tts_context_template');

  return (
    <Suspense fallback={null}>
      {showRecorder && (
          <AudioRecorder 
            onRecord={onAudioRecord} 
            onCancel={onRecorderCancel} 
            isSystemAudioRecordingEnabled={isSystemAudioRecordingEnabled}
          />
      )}
      {showCreateTextFileEditor && (
        <CreateTextFileEditor 
            onConfirm={onConfirmCreateTextFile} 
            onCancel={onCreateTextFileCancel} 
            isProcessing={isProcessingFile} 
            isLoading={isLoading} 
            t={t as (key: string) => string} 
            initialContent={initialContent}
            initialFilename={initialFilename}
            themeId={themeId}
            isPasteRichTextAsMarkdownEnabled={isPasteRichTextAsMarkdownEnabled}
        />
      )}
      {isHelpModalOpen && <HelpModal isOpen={isHelpModalOpen} onClose={onHelpModalClose} commands={allCommandsForHelp} t={t} />}
      
      {showTtsContextEditor && onCloseTtsContextEditor && setTtsContext && (
          <TextEditorModal 
            isOpen={showTtsContextEditor} 
            onClose={onCloseTtsContextEditor} 
            title={t('tts_context_title')}
            value={ttsContext || defaultTtsContextTemplate}
            onChange={setTtsContext}
            placeholder={defaultTtsContextTemplate}
            t={t as (key: string) => string}
          />
      )}
    </Suspense>
  );
};
