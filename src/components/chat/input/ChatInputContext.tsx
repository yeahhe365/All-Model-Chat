import { createContext, useContext, type Context } from 'react';
import { useChatInput } from '../../../hooks/chat-input/useChatInput';
import type { AttachmentAction } from '../../../types';

type ChatInputLogic = ReturnType<typeof useChatInput>;

export interface ChatInputContextValue extends ChatInputLogic {
  inputDisabled: boolean;
  initialTextareaHeight: number;
  handleStartLiveCamera: () => Promise<void>;
  handleStartLiveScreenShare: () => Promise<void>;
  queuedSubmissionView?: {
    title: string;
    previewText: string;
    fileCount: number;
    onEdit: () => void;
    onRemove: () => void;
  };
}

export interface ChatInputToolbarContextValue {
  appSettings: ChatInputLogic['chatInput']['appSettings'];
  currentChatSettings: ChatInputLogic['chatInput']['currentChatSettings'];
  capabilities: ChatInputLogic['capabilities'];
  isLoading: boolean;
  setCurrentChatSettings: ChatInputLogic['chatInput']['setCurrentChatSettings'];
  onToggleQuadImages: ChatInputLogic['chatInput']['onToggleQuadImages'];
  showAddByIdInput: boolean;
  fileIdInput: string;
  setFileIdInput: (value: string) => void;
  onAddFileByIdSubmit: () => void;
  onCancelAddById: () => void;
  isAddingById: boolean;
  showAddByUrlInput: boolean;
  urlInput: string;
  setUrlInput: (value: string) => void;
  onAddUrlSubmit: () => void;
  onCancelAddUrl: () => void;
  isAddingByUrl: boolean;
  ttsContext?: string;
  onEditTtsContext: () => void;
}

export interface ChatInputActionsContextValue {
  currentModelId: string;
  toolStates: ChatInputLogic['chatInput']['toolStates'];
  onAttachmentAction: (action: AttachmentAction) => void;
  disabled: boolean;
  onRecordButtonClick: () => void;
  onCancelRecording: () => void;
  isRecording: boolean;
  isMicInitializing: boolean;
  isTranscribing: boolean;
  isWaitingForUpload: boolean;
  isTranslating: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onStartLiveSession: () => void;
  onDisconnectLiveSession: () => void;
  isLiveConnected: boolean;
  isLiveMuted: boolean;
  onToggleLiveMute: () => void;
  onStartLiveCamera: () => void;
  onStartLiveScreenShare: () => void;
  onStopLiveVideo: () => void;
  liveVideoSource: 'camera' | 'screen' | null;
  onToggleToolAndFocus: (toggleFunc: () => void) => void;
  onCountTokens: () => void;
  isImageModel: boolean;
  isRealImagenModel: boolean;
  isNativeAudioModel: boolean;
  canAddYouTubeVideo: boolean;
  isLoading: boolean;
  isEditing: boolean;
  showInputTranslationButton: boolean;
  showInputPasteButton: boolean;
  showInputClearButton: boolean;
}

export interface ChatInputComposerStatusContextValue {
  hasTrimmedInput: boolean;
  canSend: boolean;
  canQueueMessage: boolean;
  onTranslate: () => void;
  onPasteFromClipboard: () => void;
  onClearInput: () => void;
  onFastSendMessage: () => void;
  onQueueMessage: () => void;
}

export const ChatInputContext = createContext<ChatInputContextValue | null>(null);
export const ChatInputToolbarContext = createContext<ChatInputToolbarContextValue | null>(null);
export const ChatInputActionsContext = createContext<ChatInputActionsContextValue | null>(null);
export const ChatInputComposerStatusContext = createContext<ChatInputComposerStatusContextValue | null>(null);

const useRequiredContext = <T,>(context: Context<T | null>, hookName: string, providerName: string) => {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${hookName} must be used within ${providerName}`);
  }
  return value;
};

export const useChatInputContext = () => {
  return useRequiredContext(ChatInputContext, 'useChatInputContext', 'ChatInputProvider');
};

export const useChatInputToolbarContext = () => {
  return useRequiredContext(ChatInputToolbarContext, 'useChatInputToolbarContext', 'ChatInputProvider');
};

export const useChatInputActionsContext = () => {
  return useRequiredContext(ChatInputActionsContext, 'useChatInputActionsContext', 'ChatInputProvider');
};

export const useChatInputComposerStatusContext = () => {
  return useRequiredContext(ChatInputComposerStatusContext, 'useChatInputComposerStatusContext', 'ChatInputProvider');
};
