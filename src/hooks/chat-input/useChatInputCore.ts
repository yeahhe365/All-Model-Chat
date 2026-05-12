import { useRef } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useWindowContext } from '@/contexts/WindowContext';
import { isBboxSystemInstruction, isHdGuideSystemInstruction } from '@/constants/promptHelpers';
import { useChatInputRuntime } from '@/components/layout/chat-runtime/ChatRuntimeContext';
import { useChatStore } from '@/stores/chatStore';
import { getCachedModelCapabilities } from '@/stores/modelCapabilitiesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getVisibleChatMessages } from '@/utils/chat/visibility';
import { useChatState } from '@/hooks/chat/useChatState';
import { useLiveAPI } from '@/hooks/useLiveAPI';
import { useTextAreaInsert } from '@/hooks/useTextAreaInsert';
import { useChatInputState } from './useChatInputState';
import { useChatInputToolStates } from './useChatInputToolStates';
import { isOpenAICompatibleApiActive } from '@/utils/openaiCompatibleMode';

export const useChatInputCore = () => {
  const { t } = useI18n();
  const appSettings = useSettingsStore((state) => state.appSettings);
  const themeId = useSettingsStore((state) => state.currentTheme.id);
  const selectedFiles = useChatStore((state) => state.selectedFiles);
  const setSelectedFiles = useChatStore((state) => state.setSelectedFiles);
  const setAppFileError = useChatStore((state) => state.setAppFileError);
  const commandedInput = useChatStore((state) => state.commandedInput);
  const editingMessageId = useChatStore((state) => state.editingMessageId);
  const setEditingMessageId = useChatStore((state) => state.setEditingMessageId);
  const editMode = useChatStore((state) => state.editMode);
  const isProcessingFile = useChatStore((state) => state.isAppProcessingFile);
  const activeMessages = useChatStore((state) => state.activeMessages);
  const {
    onMessageSent,
    onSendMessage,
    onStopGenerating,
    onCancelEdit,
    onProcessFiles,
    onAddFileById,
    onCancelUpload,
    onTranscribeAudio,
    onClearChat,
    onNewChat,
    onOpenSettings,
    onToggleLiveArtifactsPrompt,
    onTogglePinCurrentSession,
    onRetryLastTurn,
    onSelectModel,
    availableModels,
    onEditLastUserMessage,
    onTogglePip,
    isPipActive,
    setCurrentChatSettings,
    onSuggestionClick,
    onOrganizeInfoClick,
    onEditMessageContent: onUpdateMessageContent,
    onAddUserMessage,
    onLiveTranscript,
    liveClientFunctions,
    onToggleBBox,
    onToggleGuide,
    onToggleQuadImages,
  } = useChatInputRuntime();
  const { activeSessionId, currentChatSettings, isLoading } = useChatState(appSettings);
  const isEditing = !!editingMessageId;
  const inputState = useChatInputState(activeSessionId, isEditing);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { document: targetDocument } = useWindowContext();
  const insertText = useTextAreaInsert(inputState.textareaRef, inputState.setInputText);

  const isOpenAICompatibleMode = isOpenAICompatibleApiActive(appSettings);
  const toolStates = useChatInputToolStates({
    currentChatSettings,
    isLoading,
    onStopGenerating,
  });
  const chatInput = {
    appSettings,
    currentChatSettings,
    setAppFileError,
    activeSessionId,
    commandedInput,
    onMessageSent,
    selectedFiles,
    setSelectedFiles,
    onSendMessage,
    isLoading,
    isEditing,
    editMode,
    editingMessageId,
    setEditingMessageId,
    onStopGenerating,
    onCancelEdit,
    onProcessFiles,
    onAddFileById,
    onCancelUpload,
    onTranscribeAudio,
    isProcessingFile,
    toolStates,
    onClearChat,
    onNewChat,
    onOpenSettings,
    onToggleLiveArtifactsPrompt,
    onSelectModel,
    availableModels,
    onTogglePinCurrentSession,
    onRetryLastTurn,
    onEditLastUserMessage,
    onTogglePip,
    isPipActive,
    setCurrentChatSettings,
    onSuggestionClick,
    onOrganizeInfoClick,
    showEmptyStateSuggestions: getVisibleChatMessages(activeMessages).length === 0,
    onUpdateMessageContent,
    onAddUserMessage,
    onLiveTranscript,
    liveClientFunctions,
    onToggleBBox,
    isBBoxModeActive: !isOpenAICompatibleMode && isBboxSystemInstruction(currentChatSettings.systemInstruction),
    onToggleGuide,
    isGuideModeActive: !isOpenAICompatibleMode && isHdGuideSystemInstruction(currentChatSettings.systemInstruction),
    onToggleQuadImages,
    themeId,
  };

  const capabilities = getCachedModelCapabilities(currentChatSettings.modelId);

  const liveAPI = useLiveAPI({
    appSettings,
    chatSettings: currentChatSettings,
    modelId: currentChatSettings.modelId,
    onClose: undefined,
    onTranscript: onLiveTranscript,
    onGeneratedFiles: onLiveTranscript
      ? (files) => onLiveTranscript?.('', 'model', false, 'content', undefined, files)
      : undefined,
    clientFunctions: liveClientFunctions,
  });

  return {
    t,
    chatInput,
    inputState,
    fileRefs: {
      fileInputRef,
      imageInputRef,
      folderInputRef,
      zipInputRef,
      cameraInputRef,
    },
    targetDocument,
    insertText,
    capabilities,
    liveAPI,
  };
};
