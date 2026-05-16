import React, { Suspense } from 'react';
import { type CommandInfo, type UploadedFile } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { lazyNamedComponent } from '@/utils/lazyNamedComponent';

const LazyAudioRecorder = lazyNamedComponent(() => import('@/components/modals/AudioRecorder'), 'AudioRecorder');
const LazyHelpModal = lazyNamedComponent(() => import('@/components/modals/HelpModal'), 'HelpModal');
const LazyTextEditorModal = lazyNamedComponent(() => import('@/components/modals/TextEditorModal'), 'TextEditorModal');

const LazyCreateTextFileEditor = lazyNamedComponent(
  () => import('@/components/modals/CreateTextFileEditor'),
  'CreateTextFileEditor',
);

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
  const { t } = useI18n();

  if (!showRecorder && !showCreateTextFileEditor && !isHelpModalOpen && !showTtsContextEditor) {
    return null;
  }

  return (
    <>
      {showRecorder && (
        <Suspense fallback={null}>
          <LazyAudioRecorder onRecord={onAudioRecord} onCancel={onRecorderCancel} />
        </Suspense>
      )}
      {showCreateTextFileEditor && (
        <Suspense fallback={null}>
          <LazyCreateTextFileEditor
            onConfirm={onConfirmCreateTextFile}
            onCancel={onCreateTextFileCancel}
            isProcessing={isProcessingFile}
            isLoading={isLoading}
            initialContent={initialContent}
            initialFilename={initialFilename}
            themeId={themeId}
            isPasteRichTextAsMarkdownEnabled={isPasteRichTextAsMarkdownEnabled}
          />
        </Suspense>
      )}
      {isHelpModalOpen && (
        <Suspense fallback={null}>
          <LazyHelpModal isOpen={isHelpModalOpen} onClose={onHelpModalClose} commands={allCommandsForHelp} />
        </Suspense>
      )}

      {showTtsContextEditor && onCloseTtsContextEditor && setTtsContext && (
        <Suspense fallback={null}>
          <LazyTextEditorModal
            isOpen={showTtsContextEditor}
            onClose={onCloseTtsContextEditor}
            title={t('ttsDirectorNotes_title')}
            value={ttsContext || DEFAULT_TTS_CONTEXT_TEMPLATE}
            onChange={setTtsContext}
            placeholder={DEFAULT_TTS_CONTEXT_TEMPLATE}
          />
        </Suspense>
      )}
    </>
  );
};
