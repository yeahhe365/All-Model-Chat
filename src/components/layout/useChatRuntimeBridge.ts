import { useCallback, useLayoutEffect, useMemo } from 'react';

import type { AppViewModel } from '../../hooks/app/useApp';
import { useChatStore } from '../../stores/chatStore';
import { useChatRuntimeStore, type ChatRuntimeModel } from '../../stores/chatRuntimeStore';
import { useUIStore } from '../../stores/uiStore';
import type { AppSettings, UploadedFile } from '../../types';

interface UseChatRuntimeBridgeOptions {
  app: AppViewModel;
}

const buildHeaderModels = (appSettings: AppSettings, apiModels: AppViewModel['chatState']['apiModels']) => {
  const seenIds = new Set<string>();
  const geminiModels = apiModels.map((model) => ({ ...model, apiMode: 'gemini-native' as const }));
  const openAICompatibleModels = appSettings.openaiCompatibleModels.map((model) => ({
    ...model,
    apiMode: 'openai-compatible' as const,
  }));

  return [...geminiModels, ...openAICompatibleModels].filter((model) => {
    if (seenIds.has(model.id)) {
      return false;
    }

    seenIds.add(model.id);
    return true;
  });
};

export const useChatRuntimeBridge = ({ app }: UseChatRuntimeBridgeOptions) => {
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
  const isOpenAICompatibleMode = appSettings.apiMode === 'openai-compatible';
  const openAICompatibleModelIds = useMemo(
    () => new Set(appSettings.openaiCompatibleModels.map((model) => model.id)),
    [appSettings.openaiCompatibleModels],
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

      if (isOpenAICompatibleModel && (!isGeminiModel || isOpenAICompatibleMode)) {
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
      geminiModelIds,
      isOpenAICompatibleMode,
      openAICompatibleModelIds,
      setAppSettings,
    ],
  );

  const messageActions = useMemo(
    () => ({
      setScrollContainerRef: chatState.setScrollContainerRef,
      onEditMessage: chatState.handleEditMessage,
      onDeleteMessage: chatState.handleDeleteMessage,
      onRetryMessage: chatState.handleRetryMessage,
      onUpdateMessageFile: chatState.handleUpdateMessageFile,
      onSuggestionClick,
      onOrganizeInfoClick,
      onFollowUpSuggestionClick,
      onGenerateCanvas: chatState.handleGenerateCanvas,
      onContinueGeneration: chatState.handleContinueGeneration,
      onForkMessage: chatState.handleForkMessage,
      onQuickTTS: chatState.handleQuickTTS,
      onOpenSidePanel: handleOpenSidePanel,
    }),
    [
      chatState,
      handleOpenSidePanel,
      onFollowUpSuggestionClick,
      onOrganizeInfoClick,
      onSuggestionClick,
    ],
  );

  const inputActions = useMemo(
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
      onOpenSettings: openSettingsModal,
      onToggleCanvasPrompt: handleLoadCanvasPromptAndSave,
      onTogglePinCurrentSession: chatState.handleTogglePinCurrentSession,
      onRetryLastTurn: chatState.handleRetryLastTurn,
      onEditLastUserMessage: chatState.handleEditLastUserMessage,
      onToggleQuadImages,
      setCurrentChatSettings: chatState.setCurrentChatSettings,
      onAddUserMessage: chatState.handleAddUserMessage,
      onLiveTranscript: chatState.handleLiveTranscript,
      liveClientFunctions: chatState.liveClientFunctions,
      onEditMessageContent: chatState.handleUpdateMessageContent,
      onToggleBBox: handleToggleBBoxMode,
      onToggleGuide: handleToggleGuideMode,
    }),
    [
      chatState,
      handleLoadCanvasPromptAndSave,
      handleToggleBBoxMode,
      handleToggleGuideMode,
      onMessageSent,
      onSendMessage,
      onToggleQuadImages,
      openSettingsModal,
    ],
  );

  const runtime = useMemo<Partial<ChatRuntimeModel>>(
    () => ({
      sessionTitle,
      currentModelName,
      availableModels: headerAvailableModels,
      selectedModelId: headerSelectedModelId,
      isAppDraggingOver: chatState.isAppDraggingOver,
      modelsLoadingError: chatState.modelsLoadingError,
      handleAppDragEnter: chatState.handleAppDragEnter,
      handleAppDragOver: chatState.handleAppDragOver,
      handleAppDragLeave: chatState.handleAppDragLeave,
      handleAppDrop: chatState.handleAppDrop,
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
      ...messageActions,
      ...inputActions,
    }),
    [
      chatState,
      currentModelName,
      handleHeaderSelectModel,
      handleLoadCanvasPromptAndSave,
      handleSetThinkingLevel,
      headerAvailableModels,
      headerSelectedModelId,
      inputActions,
      isCanvasPromptActive,
      isCanvasPromptBusy,
      messageActions,
      onToggleGemmaReasoning,
      openScenariosModal,
      pipState,
      sessionTitle,
      toggleHistorySidebar,
    ],
  );

  useLayoutEffect(() => {
    useChatRuntimeStore.getState().setChatRuntime(runtime);
  }, [runtime]);
};
