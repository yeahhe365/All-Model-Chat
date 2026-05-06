import React from 'react';
import { AudioRecorder } from '../../modals/AudioRecorder';
import { CreateTextFileEditor } from '../../modals/CreateTextFileEditor';
import { HelpModal } from '../../modals/HelpModal';
import { TextEditorModal } from '../../modals/TextEditorModal';
import { CommandInfo, UploadedFile } from '../../../types';

interface ChatInputModalsProps {
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
  initialContent?: string;
  initialFilename?: string;
  editingFile?: UploadedFile | null;
  themeId: string;
  isPasteRichTextAsMarkdownEnabled?: boolean;
  showTtsContextEditor?: boolean;
  onCloseTtsContextEditor?: () => void;
  ttsContext?: string;
  setTtsContext?: (val: string) => void;
}

const DEFAULT_TTS_CONTEXT_TEMPLATE = `# AUDIO PROFILE: [Name]
## THE SCENE: [Description]
### DIRECTOR'S NOTES
Style: [e.g. Happy]
Pace: [e.g. Fast]

### SPEAKER VOICES (optional)
Speaker 1: Kore
Speaker 2: Puck`;

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
  initialContent,
  initialFilename,
  themeId,
  isPasteRichTextAsMarkdownEnabled,
  showTtsContextEditor,
  onCloseTtsContextEditor,
  ttsContext,
  setTtsContext,
}) => {
  if (!showRecorder && !showCreateTextFileEditor && !isHelpModalOpen && !showTtsContextEditor) {
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
          initialContent={initialContent}
          initialFilename={initialFilename}
          themeId={themeId}
          isPasteRichTextAsMarkdownEnabled={isPasteRichTextAsMarkdownEnabled}
        />
      )}
      {isHelpModalOpen && (
        <HelpModal isOpen={isHelpModalOpen} onClose={onHelpModalClose} commands={allCommandsForHelp} />
      )}

      {showTtsContextEditor && onCloseTtsContextEditor && setTtsContext && (
        <TextEditorModal
          isOpen={showTtsContextEditor}
          onClose={onCloseTtsContextEditor}
          title="TTS Director's Notes"
          value={ttsContext || DEFAULT_TTS_CONTEXT_TEMPLATE}
          onChange={setTtsContext}
          placeholder={DEFAULT_TTS_CONTEXT_TEMPLATE}
        />
      )}
    </>
  );
};
