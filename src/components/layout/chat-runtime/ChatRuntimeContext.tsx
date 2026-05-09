/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { DragEvent, ReactNode } from 'react';
import type { Part } from '@google/genai';

import type { AppViewModel } from '../../../hooks/app/useApp';
import { useChatStore } from '../../../stores/chatStore';
import { useUIStore } from '../../../stores/uiStore';
import type {
  AppSettings,
  ChatSettingsUpdater,
  LiveClientFunctions,
  ModelOption,
  SideViewContent,
  UploadedFile,
  VideoMetadata,
} from '../../../types';
import type { MediaResolution } from '../../../types/settings';
import { isOpenAICompatibleApiActive } from '../../../utils/openaiCompatibleMode';

type ThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

interface ChatHeaderRuntimeValue {
  isAppDraggingOver: boolean;
  modelsLoadingError: string | null;
  handleAppDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  handleAppDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleAppDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleAppDrop: (event: DragEvent<HTMLDivElement>) => void;
  currentModelName: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  isCanvasPromptActive: boolean;
  isCanvasPromptBusy: boolean;
  isPipSupported: boolean;
  isPipActive: boolean;
  onNewChat: () => void;
  onOpenScenariosModal: () => void;
  onToggleHistorySidebar: () => void;
  onLoadCanvasPrompt: () => void;
  onSelectModel: (modelId: string) => void;
  onSetThinkingLevel: (level: ThinkingLevel) => void;
  onToggleGemmaReasoning: () => void;
  onTogglePip: () => void;
}

interface ChatMessageListRuntimeValue {
  sessionTitle: string;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onEditMessage: (messageId: string, mode?: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  onUpdateMessageFile: (
    messageId: string,
    fileId: string,
    updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution },
  ) => void;
  onFollowUpSuggestionClick: (suggestion: string) => void;
  onGenerateCanvas: (messageId: string, text: string) => void;
  onContinueGeneration: (messageId: string) => void;
  onForkMessage: (messageId: string) => void;
  onQuickTTS: (text: string) => Promise<string | null>;
  onOpenSidePanel: (content: SideViewContent) => void;
}

interface ChatInputRuntimeValue {
  onMessageSent: () => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => void;
  onStopGenerating: () => void;
  onCancelEdit: () => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>;
  onCancelUpload: (fileId: string) => void;
  onTranscribeAudio: (file: File) => Promise<string | null>;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onSelectModel: (modelId: string) => void;
  availableModels: ModelOption[];
  onEditLastUserMessage: () => void;
  onTogglePip: () => void;
  isPipActive: boolean;
  onToggleQuadImages: () => void;
  setCurrentChatSettings: ChatSettingsUpdater;
  onSuggestionClick: (suggestion: string) => void;
  onOrganizeInfoClick: (suggestion: string) => void;
  onAddUserMessage: (text: string, files?: UploadedFile[]) => void;
  onLiveTranscript?: (
    text: string,
    role: 'user' | 'model',
    isFinal: boolean,
    type?: 'content' | 'thought',
    audioUrl?: string | null,
    generatedFiles?: UploadedFile[],
    apiPart?: Part,
  ) => void;
  liveClientFunctions?: LiveClientFunctions;
  onEditMessageContent: (messageId: string, content: string) => void;
  onToggleBBox: () => void;
  onToggleGuide: () => void;
}

interface ChatRuntimeValues {
  header: ChatHeaderRuntimeValue;
  messageList: ChatMessageListRuntimeValue;
  input: ChatInputRuntimeValue;
}

interface ChatRuntimeProviderProps {
  app: AppViewModel;
  children: ReactNode;
}

interface ChatRuntimeValuesProviderProps {
  value: ChatRuntimeValues;
  children: ReactNode;
}

const ChatHeaderRuntimeContext = createContext<ChatHeaderRuntimeValue | null>(null);
const ChatMessageListRuntimeContext = createContext<ChatMessageListRuntimeValue | null>(null);
const ChatInputRuntimeContext = createContext<ChatInputRuntimeValue | null>(null);

const buildHeaderModels = (appSettings: AppSettings, apiModels: AppViewModel['chatState']['apiModels']) => {
  const seenIds = new Set<string>();
  const geminiModels = apiModels.map((model) => ({ ...model, apiMode: 'gemini-native' as const }));
  const openAICompatibleModels =
    appSettings.isOpenAICompatibleApiEnabled === true
      ? appSettings.openaiCompatibleModels.map((model) => ({
          ...model,
          apiMode: 'openai-compatible' as const,
        }))
      : [];

  return [...geminiModels, ...openAICompatibleModels].filter((model) => {
    if (seenIds.has(model.id)) {
      return false;
    }

    seenIds.add(model.id);
    return true;
  });
};

const useRequiredContext = <T,>(context: React.Context<T | null>, name: string) => {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${name} must be used within ChatRuntimeProvider`);
  }
  return value;
};

export const useChatRuntimeValues = (app: AppViewModel): ChatRuntimeValues => {
  const {
    appSettings,
    setAppSettings,
    chatState,
    pipState,
    sessionTitle,
    handleOpenSidePanel,
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isCanvasPromptActive,
    isCanvasPromptBusy,
    handleSetThinkingLevel,
    getCurrentModelDisplayName,
  } = app;
  const { setIsHistorySidebarOpen } = app.uiState;
  const setIsSettingsModalOpen = useUIStore((state) => state.setIsSettingsModalOpen);
  const setIsPreloadedMessagesModalOpen = useUIStore((state) => state.setIsPreloadedMessagesModalOpen);

  const openSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, [setIsSettingsModalOpen]);

  const openScenariosModal = useCallback(() => {
    setIsPreloadedMessagesModalOpen(true);
  }, [setIsPreloadedMessagesModalOpen]);

  const toggleHistorySidebar = useCallback(() => {
    setIsHistorySidebarOpen((prev) => !prev);
  }, [setIsHistorySidebarOpen]);

  const onSuggestionClick = useCallback(
    (text: string) => {
      handleSuggestionClick('homepage', text);
    },
    [handleSuggestionClick],
  );

  const onOrganizeInfoClick = useCallback(
    (text: string) => {
      handleSuggestionClick('organize', text);
    },
    [handleSuggestionClick],
  );

  const onFollowUpSuggestionClick = useCallback(
    (text: string) => {
      handleSuggestionClick('follow-up', text);
    },
    [handleSuggestionClick],
  );

  const onMessageSent = useCallback(() => {
    useChatStore.getState().setCommandedInput(null);
  }, []);

  const onSendMessage = useCallback(
    (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => {
      chatState.handleSendMessage({ text, ...options });
    },
    [chatState],
  );

  const onToggleQuadImages = useCallback(() => {
    setAppSettings((prev) => ({
      ...prev,
      generateQuadImages: !prev.generateQuadImages,
    }));
  }, [setAppSettings]);

  const gemmaReasoningEnabled = chatState.currentChatSettings.showThoughts;
  const onToggleGemmaReasoning = useCallback(() => {
    const nextGemmaReasoningEnabled = !gemmaReasoningEnabled;

    setAppSettings((prev) => ({
      ...prev,
      showThoughts: nextGemmaReasoningEnabled,
    }));

    chatState.setCurrentChatSettings((prev) => ({
      ...prev,
      showThoughts: nextGemmaReasoningEnabled,
    }));
  }, [chatState, gemmaReasoningEnabled, setAppSettings]);

  const currentModelName = getCurrentModelDisplayName();
  const isOpenAICompatibleMode = isOpenAICompatibleApiActive(appSettings);
  const openAICompatibleModelIds = useMemo(
    () =>
      new Set(
        appSettings.isOpenAICompatibleApiEnabled === true
          ? appSettings.openaiCompatibleModels.map((model) => model.id)
          : [],
      ),
    [appSettings.isOpenAICompatibleApiEnabled, appSettings.openaiCompatibleModels],
  );
  const geminiModelIds = useMemo(() => new Set(chatState.apiModels.map((model) => model.id)), [chatState.apiModels]);
  const headerAvailableModels = useMemo(
    () => buildHeaderModels(appSettings, chatState.apiModels),
    [appSettings, chatState.apiModels],
  );
  const headerSelectedModelId = isOpenAICompatibleMode
    ? appSettings.openaiCompatibleModelId
    : chatState.currentChatSettings.modelId || appSettings.modelId;
  const handleHeaderSelectModel = useCallback(
    (modelId: string) => {
      const isOpenAICompatibleModel = openAICompatibleModelIds.has(modelId);
      const isGeminiModel = geminiModelIds.has(modelId);

      if (
        appSettings.isOpenAICompatibleApiEnabled === true &&
        isOpenAICompatibleModel &&
        (!isGeminiModel || isOpenAICompatibleMode)
      ) {
        setAppSettings((prev) => ({
          ...prev,
          apiMode: 'openai-compatible',
          openaiCompatibleModelId: modelId,
        }));
        return;
      }

      if (isOpenAICompatibleMode) {
        setAppSettings((prev) => ({
          ...prev,
          apiMode: 'gemini-native',
        }));
      }
      chatState.handleSelectModelInHeader(modelId);
    },
    [
      chatState,
      appSettings.isOpenAICompatibleApiEnabled,
      geminiModelIds,
      isOpenAICompatibleMode,
      openAICompatibleModelIds,
      setAppSettings,
    ],
  );

  const header = useMemo<ChatHeaderRuntimeValue>(
    () => ({
      isAppDraggingOver: chatState.isAppDraggingOver,
      modelsLoadingError: chatState.modelsLoadingError,
      handleAppDragEnter: chatState.handleAppDragEnter,
      handleAppDragOver: chatState.handleAppDragOver,
      handleAppDragLeave: chatState.handleAppDragLeave,
      handleAppDrop: chatState.handleAppDrop,
      currentModelName,
      availableModels: headerAvailableModels,
      selectedModelId: headerSelectedModelId,
      isCanvasPromptActive,
      isCanvasPromptBusy: !!isCanvasPromptBusy,
      isPipSupported: pipState.isPipSupported,
      isPipActive: pipState.isPipActive,
      onNewChat: chatState.startNewChat,
      onOpenScenariosModal: openScenariosModal,
      onToggleHistorySidebar: toggleHistorySidebar,
      onLoadCanvasPrompt: handleLoadCanvasPromptAndSave,
      onSelectModel: handleHeaderSelectModel,
      onSetThinkingLevel: handleSetThinkingLevel,
      onToggleGemmaReasoning,
      onTogglePip: pipState.togglePip,
    }),
    [
      chatState,
      currentModelName,
      handleHeaderSelectModel,
      handleLoadCanvasPromptAndSave,
      handleSetThinkingLevel,
      headerAvailableModels,
      headerSelectedModelId,
      isCanvasPromptActive,
      isCanvasPromptBusy,
      onToggleGemmaReasoning,
      openScenariosModal,
      pipState,
      toggleHistorySidebar,
    ],
  );

  const messageList = useMemo<ChatMessageListRuntimeValue>(
    () => ({
      sessionTitle,
      setScrollContainerRef: chatState.setScrollContainerRef,
      onEditMessage: chatState.handleEditMessage,
      onDeleteMessage: chatState.handleDeleteMessage,
      onRetryMessage: chatState.handleRetryMessage,
      onUpdateMessageFile: chatState.handleUpdateMessageFile,
      onFollowUpSuggestionClick,
      onGenerateCanvas: chatState.handleGenerateCanvas,
      onContinueGeneration: chatState.handleContinueGeneration,
      onForkMessage: chatState.handleForkMessage,
      onQuickTTS: chatState.handleQuickTTS,
      onOpenSidePanel: handleOpenSidePanel,
    }),
    [chatState, handleOpenSidePanel, onFollowUpSuggestionClick, sessionTitle],
  );

  const input = useMemo<ChatInputRuntimeValue>(
    () => ({
      onMessageSent,
      onSendMessage,
      onStopGenerating: chatState.handleStopGenerating,
      onCancelEdit: chatState.handleCancelEdit,
      onProcessFiles: chatState.handleProcessAndAddFiles,
      onAddFileById: chatState.handleAddFileById,
      onCancelUpload: chatState.handleCancelFileUpload,
      onTranscribeAudio: chatState.handleTranscribeAudio,
      onClearChat: chatState.handleClearCurrentChat,
      onNewChat: chatState.startNewChat,
      onOpenSettings: openSettingsModal,
      onToggleCanvasPrompt: handleLoadCanvasPromptAndSave,
      onTogglePinCurrentSession: chatState.handleTogglePinCurrentSession,
      onRetryLastTurn: chatState.handleRetryLastTurn,
      onSelectModel: handleHeaderSelectModel,
      availableModels: headerAvailableModels,
      onEditLastUserMessage: chatState.handleEditLastUserMessage,
      onTogglePip: pipState.togglePip,
      isPipActive: pipState.isPipActive,
      onToggleQuadImages,
      setCurrentChatSettings: chatState.setCurrentChatSettings,
      onSuggestionClick,
      onOrganizeInfoClick,
      onAddUserMessage: chatState.handleAddUserMessage,
      onLiveTranscript: chatState.handleLiveTranscript,
      liveClientFunctions: chatState.liveClientFunctions,
      onEditMessageContent: chatState.handleUpdateMessageContent,
      onToggleBBox: handleToggleBBoxMode,
      onToggleGuide: handleToggleGuideMode,
    }),
    [
      chatState,
      handleHeaderSelectModel,
      handleLoadCanvasPromptAndSave,
      handleToggleBBoxMode,
      handleToggleGuideMode,
      headerAvailableModels,
      onMessageSent,
      onOrganizeInfoClick,
      onSendMessage,
      onSuggestionClick,
      onToggleQuadImages,
      openSettingsModal,
      pipState.isPipActive,
      pipState.togglePip,
    ],
  );

  return useMemo(
    () => ({
      header,
      messageList,
      input,
    }),
    [header, input, messageList],
  );
};

export const ChatRuntimeValuesProvider: React.FC<ChatRuntimeValuesProviderProps> = ({ value, children }) => (
  <ChatHeaderRuntimeContext.Provider value={value.header}>
    <ChatMessageListRuntimeContext.Provider value={value.messageList}>
      <ChatInputRuntimeContext.Provider value={value.input}>{children}</ChatInputRuntimeContext.Provider>
    </ChatMessageListRuntimeContext.Provider>
  </ChatHeaderRuntimeContext.Provider>
);

export const ChatRuntimeProvider: React.FC<ChatRuntimeProviderProps> = ({ app, children }) => {
  const value = useChatRuntimeValues(app);
  return <ChatRuntimeValuesProvider value={value}>{children}</ChatRuntimeValuesProvider>;
};

export const useChatHeaderRuntime = () => useRequiredContext(ChatHeaderRuntimeContext, 'useChatHeaderRuntime');
export const useChatMessageListRuntime = () =>
  useRequiredContext(ChatMessageListRuntimeContext, 'useChatMessageListRuntime');
export const useChatInputRuntime = () => useRequiredContext(ChatInputRuntimeContext, 'useChatInputRuntime');
