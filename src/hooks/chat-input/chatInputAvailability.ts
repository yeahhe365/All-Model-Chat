import type { UploadedFile } from '../../types';
import { hasSendableChatInputContent } from './chatInputUtils';
import { getChatInputMode, type ChatInputMachineState } from './chatInputStateMachine';
import { areFilesStillProcessing } from './pendingSubmissionUtils';

interface ChatInputAvailabilityState {
  inputText: string;
  quotes: string[];
  isAddingById: boolean;
}

interface ChatInputModalState {
  showCreateTextFileEditor: boolean;
  showRecorder: boolean;
  showTtsContextEditor: boolean;
  isHelpModalOpen: boolean;
}

interface ChatInputLocalFileState {
  configuringFile: unknown;
  previewFile: unknown;
  showTokenModal: boolean;
  isConverting: boolean;
}

interface ChatInputCapabilities {
  isNativeAudioModel: boolean;
}

interface ChatInputAvailabilityOptions {
  inputState: ChatInputAvailabilityState;
  modalsState: ChatInputModalState;
  localFileState: ChatInputLocalFileState;
  selectedFiles: UploadedFile[];
  capabilities: ChatInputCapabilities;
  activeSessionId: string | null;
  isLoading: boolean;
  isEditing: boolean;
}

interface ChatInputModeOptions {
  inputState: {
    machineState: ChatInputMachineState;
  };
  localFileState: Pick<ChatInputLocalFileState, 'isConverting'>;
  capabilities: Partial<ChatInputCapabilities>;
  liveAPI: {
    isConnected: boolean;
    isReconnecting: boolean;
    error: string | null;
  };
  activeQueuedSubmission: unknown;
  canQueueMessage: boolean;
  isEditing: boolean;
  isProcessingFile: boolean;
}

export const getChatInputAvailability = ({
  inputState,
  modalsState,
  localFileState,
  selectedFiles,
  capabilities,
  activeSessionId,
  isLoading,
  isEditing,
}: ChatInputAvailabilityOptions) => {
  const isModalOpen =
    modalsState.showCreateTextFileEditor ||
    modalsState.showRecorder ||
    !!localFileState.configuringFile ||
    !!localFileState.previewFile ||
    localFileState.showTokenModal ||
    modalsState.showTtsContextEditor;

  const hasSendableContent = hasSendableChatInputContent({
    inputText: inputState.inputText,
    quotes: inputState.quotes,
    selectedFileCount: selectedFiles.length,
    isNativeAudioModel: capabilities.isNativeAudioModel,
  });

  const canSend =
    hasSendableContent && !isLoading && !inputState.isAddingById && !isModalOpen && !localFileState.isConverting;

  const canQueueMessageBase =
    !capabilities.isNativeAudioModel &&
    hasSendableContent &&
    !!activeSessionId &&
    isLoading &&
    !isEditing &&
    !inputState.isAddingById &&
    !isModalOpen &&
    !localFileState.isConverting &&
    !areFilesStillProcessing(selectedFiles);

  return {
    isAnyModalOpen: isModalOpen || modalsState.isHelpModalOpen,
    canSend,
    canQueueMessageBase,
  };
};

export const getCurrentChatInputMode = ({
  inputState,
  localFileState,
  capabilities,
  liveAPI,
  activeQueuedSubmission,
  canQueueMessage,
  isEditing,
  isProcessingFile,
}: ChatInputModeOptions) =>
  getChatInputMode({
    state: inputState.machineState,
    isEditing,
    hasActiveQueuedSubmission: !!activeQueuedSubmission,
    canQueueMessage,
    isNativeAudioModel: capabilities.isNativeAudioModel || false,
    liveStatus: {
      isConnected: liveAPI.isConnected,
      isReconnecting: liveAPI.isReconnecting,
      error: liveAPI.error,
    },
    isProcessingFile,
    isConverting: localFileState.isConverting,
  });
