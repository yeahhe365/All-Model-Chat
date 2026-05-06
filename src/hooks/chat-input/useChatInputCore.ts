import { useRef } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { useWindowContext } from '../../contexts/WindowContext';
import { isBboxSystemInstruction, isHdGuideSystemInstruction } from '../../constants/promptHelpers';
import { useChatStore } from '../../stores/chatStore';
import { useChatRuntimeStore } from '../../stores/chatRuntimeStore';
import { getCachedModelCapabilities } from '../../stores/modelCapabilitiesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getVisibleChatMessages } from '../../utils/chat/visibility';
import { useChatState } from '../chat/useChatState';
import { useLiveAPI } from '../useLiveAPI';
import { useTextAreaInsert } from '../useTextAreaInsert';
import { useChatInputState } from './useChatInputState';
import { useChatInputToolStates } from './useChatInputToolStates';

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
  const onMessageSent = useChatRuntimeStore((state) => state.onMessageSent);
  const onSendMessage = useChatRuntimeStore((state) => state.onSendMessage);
  const onStopGenerating = useChatRuntimeStore((state) => state.onStopGenerating);
  const onCancelEdit = useChatRuntimeStore((state) => state.onCancelEdit);
  const onProcessFiles = useChatRuntimeStore((state) => state.onProcessFiles);
  const onAddFileById = useChatRuntimeStore((state) => state.onAddFileById);
  const onCancelUpload = useChatRuntimeStore((state) => state.onCancelUpload);
  const onTranscribeAudio = useChatRuntimeStore((state) => state.onTranscribeAudio);
  const onClearChat = useChatRuntimeStore((state) => state.onClearChat);
  const onNewChat = useChatRuntimeStore((state) => state.onNewChat);
  const onOpenSettings = useChatRuntimeStore((state) => state.onOpenSettings);
  const onToggleCanvasPrompt = useChatRuntimeStore((state) => state.onToggleCanvasPrompt);
  const onTogglePinCurrentSession = useChatRuntimeStore((state) => state.onTogglePinCurrentSession);
  const onRetryLastTurn = useChatRuntimeStore((state) => state.onRetryLastTurn);
  const onSelectModel = useChatRuntimeStore((state) => state.onSelectModel);
  const availableModels = useChatRuntimeStore((state) => state.availableModels);
  const onEditLastUserMessage = useChatRuntimeStore((state) => state.onEditLastUserMessage);
  const onTogglePip = useChatRuntimeStore((state) => state.onTogglePip);
  const isPipActive = useChatRuntimeStore((state) => state.isPipActive);
  const setCurrentChatSettings = useChatRuntimeStore((state) => state.setCurrentChatSettings);
  const onSuggestionClick = useChatRuntimeStore((state) => state.onSuggestionClick);
  const onOrganizeInfoClick = useChatRuntimeStore((state) => state.onOrganizeInfoClick);
  const onUpdateMessageContent = useChatRuntimeStore((state) => state.onEditMessageContent);
  const onAddUserMessage = useChatRuntimeStore((state) => state.onAddUserMessage);
  const onLiveTranscript = useChatRuntimeStore((state) => state.onLiveTranscript);
  const liveClientFunctions = useChatRuntimeStore((state) => state.liveClientFunctions);
  const onToggleBBox = useChatRuntimeStore((state) => state.onToggleBBox);
  const onToggleGuide = useChatRuntimeStore((state) => state.onToggleGuide);
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

  const isOpenAICompatibleMode = appSettings.apiMode === 'openai-compatible';
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
    onToggleCanvasPrompt,
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
