import type { UploadedFile } from '../../types';
import { buildChatInputSubmitText } from './chatInputUtils';

export type PendingChatInputSubmission =
  | {
      kind: 'send';
      textToSend: string;
      isFastMode: boolean;
    }
  | {
      kind: 'edit';
      messageId: string;
      content: string;
    };

interface BuildPendingChatInputSubmissionParams {
  inputText: string;
  quotes: string[];
  modelId: string;
  ttsContext?: string;
  isEditing: boolean;
  editMode: 'update' | 'resend';
  editingMessageId: string | null;
  isFastMode: boolean;
}

interface ShouldFlushPendingSubmissionParams {
  pendingSubmission: PendingChatInputSubmission | null;
  previousFiles: UploadedFile[];
  currentFiles: UploadedFile[];
}

export const buildPendingChatInputSubmission = ({
  inputText,
  quotes,
  modelId,
  ttsContext,
  isEditing,
  editMode,
  editingMessageId,
  isFastMode,
}: BuildPendingChatInputSubmissionParams): PendingChatInputSubmission => {
  if (isEditing && editMode === 'update' && editingMessageId) {
    return {
      kind: 'edit',
      messageId: editingMessageId,
      content: inputText,
    };
  }

  return {
    kind: 'send',
    textToSend: buildChatInputSubmitText({
      inputText,
      quotes,
      modelId,
      ttsContext,
    }),
    isFastMode,
  };
};

export const areFilesStillProcessing = (files: UploadedFile[]) => files.some((file) => file.isProcessing);

export const shouldFlushPendingSubmission = ({
  pendingSubmission,
  previousFiles,
  currentFiles,
}: ShouldFlushPendingSubmissionParams) =>
  !!pendingSubmission && areFilesStillProcessing(previousFiles) && !areFilesStillProcessing(currentFiles);
