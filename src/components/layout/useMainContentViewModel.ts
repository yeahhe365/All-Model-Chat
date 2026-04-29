import { useCallback, useMemo } from 'react';

import type { UploadedFile } from '../../types';
import type { AppViewModel } from '../../hooks/app/useApp';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { getShortcutDisplay } from '../../utils/shortcutUtils';
import { isBboxSystemInstruction, isHdGuideSystemInstruction } from '../../constants/promptHelpers';
import type { ChatAreaProps } from './chat-area/ChatAreaProps';
import { buildSidePanelKey } from './mainContentModels';

interface UseMainContentViewModelOptions {
  app: AppViewModel;
}

export const useMainContentViewModel = ({ app }: UseMainContentViewModelOptions) => {
  const {
    appSettings,
    currentTheme,
    chatState,
    uiState,
    pipState,
    eventsState,
    sidePanelContent,
    handleOpenSidePanel,
    handleCloseSidePanel,
    isExportModalOpen,
    setIsExportModalOpen,
    exportStatus,
    handleExportChat,
    sessionTitle,
    handleSaveSettings,
    handleSaveCurrentChatSettings,
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isCanvasPromptActive,
    isCanvasPromptBusy,
    handleSetThinkingLevel,
    getCurrentModelDisplayName,
    handleExportSettings,
    handleExportHistory,
    handleExportAllScenarios,
    handleImportSettings,
    handleImportHistory,
    handleImportAllScenarios,
  } = app;
  const { setAppSettings } = app;
  const { setIsHistorySidebarOpen, setIsHistorySidebarOpenTransient } = uiState;
  const { loadChatSession, handleSendMessage, handleSelectModelInHeader } = chatState;

  const isSettingsModalOpen = useUIStore((state) => state.isSettingsModalOpen);
  const setIsSettingsModalOpen = useUIStore((state) => state.setIsSettingsModalOpen);
  const isPreloadedMessagesModalOpen = useUIStore((state) => state.isPreloadedMessagesModalOpen);
  const setIsPreloadedMessagesModalOpen = useUIStore((state) => state.setIsPreloadedMessagesModalOpen);
  const isLogViewerOpen = useUIStore((state) => state.isLogViewerOpen);
  const setIsLogViewerOpen = useUIStore((state) => state.setIsLogViewerOpen);

  const openSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, [setIsSettingsModalOpen]);

  const openScenariosModal = useCallback(() => {
    setIsPreloadedMessagesModalOpen(true);
  }, [setIsPreloadedMessagesModalOpen]);

  const toggleHistorySidebar = useCallback(() => {
    setIsHistorySidebarOpen((prev) => !prev);
  }, [setIsHistorySidebarOpen]);

  const closeHistorySidebar = useCallback(() => {
    setIsHistorySidebarOpen(false);
  }, [setIsHistorySidebarOpen]);

  const selectSession = useCallback(
    (id: string) => {
      return loadChatSession(id);
    },
    [loadChatSession],
  );

  const openExportModal = useCallback(
    async (sessionId?: string) => {
      if (sessionId && sessionId !== chatState.activeSessionId) {
        await loadChatSession(sessionId);
      }
      setIsExportModalOpen(true);
    },
    [chatState.activeSessionId, loadChatSession, setIsExportModalOpen],
  );

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
      handleSendMessage({ text, ...options });
    },
    [handleSendMessage],
  );

  const onToggleQuadImages = useCallback(() => {
    setAppSettings((prev) => ({
      ...prev,
      generateQuadImages: !prev.generateQuadImages,
    }));
  }, [setAppSettings]);

  const gemmaReasoningEnabled = chatState.currentChatSettings.showThoughts;
  const setCurrentChatSettings = chatState.setCurrentChatSettings;

  const onToggleGemmaReasoning = useCallback(() => {
    const nextGemmaReasoningEnabled = !gemmaReasoningEnabled;

    setAppSettings((prev) => ({
      ...prev,
      showThoughts: nextGemmaReasoningEnabled,
    }));

    setCurrentChatSettings((prev) => ({
      ...prev,
      showThoughts: nextGemmaReasoningEnabled,
    }));
  }, [gemmaReasoningEnabled, setAppSettings, setCurrentChatSettings]);

  const messageActions: ChatAreaProps['chatArea']['messageActions'] = useMemo(
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
      chatState.handleContinueGeneration,
      chatState.handleDeleteMessage,
      chatState.handleEditMessage,
      chatState.handleForkMessage,
      chatState.handleGenerateCanvas,
      chatState.handleQuickTTS,
      chatState.handleRetryMessage,
      chatState.handleUpdateMessageFile,
      chatState.setScrollContainerRef,
      handleOpenSidePanel,
      onFollowUpSuggestionClick,
      onOrganizeInfoClick,
      onSuggestionClick,
    ],
  );

  const inputActions: ChatAreaProps['chatArea']['inputActions'] = useMemo(
    () => ({
      onMessageSent,
      onSendMessage,
      onStopGenerating: chatState.handleStopGenerating,
      onCancelEdit: chatState.handleCancelEdit,
      onProcessFiles: chatState.handleProcessAndAddFiles,
      onAddFileById: chatState.handleAddFileById,
      onCancelUpload: chatState.handleCancelFileUpload,
      onTranscribeAudio: chatState.handleTranscribeAudio,
      onToggleGoogleSearch: chatState.toggleGoogleSearch,
      onToggleCodeExecution: chatState.toggleCodeExecution,
      onToggleLocalPython: chatState.toggleLocalPython,
      onToggleUrlContext: chatState.toggleUrlContext,
      onToggleDeepSearch: chatState.toggleDeepSearch,
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
      chatState.handleAddFileById,
      chatState.handleAddUserMessage,
      chatState.handleCancelEdit,
      chatState.handleCancelFileUpload,
      chatState.handleClearCurrentChat,
      chatState.handleEditLastUserMessage,
      chatState.handleLiveTranscript,
      chatState.handleProcessAndAddFiles,
      chatState.handleRetryLastTurn,
      chatState.handleStopGenerating,
      chatState.handleTranscribeAudio,
      chatState.handleTogglePinCurrentSession,
      chatState.handleUpdateMessageContent,
      chatState.liveClientFunctions,
      chatState.setCurrentChatSettings,
      chatState.toggleCodeExecution,
      chatState.toggleDeepSearch,
      chatState.toggleGoogleSearch,
      chatState.toggleLocalPython,
      chatState.toggleUrlContext,
      handleLoadCanvasPromptAndSave,
      handleToggleBBoxMode,
      handleToggleGuideMode,
      onMessageSent,
      onSendMessage,
      onToggleQuadImages,
      openSettingsModal,
    ],
  );

  const currentModelName = getCurrentModelDisplayName();
  const isOpenAICompatibleMode = appSettings.apiMode === 'openai-compatible';
  const openAICompatibleModelIds = useMemo(
    () => new Set(appSettings.openaiCompatibleModels.map((model) => model.id)),
    [appSettings.openaiCompatibleModels],
  );
  const geminiModelIds = useMemo(() => new Set(chatState.apiModels.map((model) => model.id)), [chatState.apiModels]);
  const headerAvailableModels = useMemo(() => {
    const seenIds = new Set<string>();
    const geminiModels = chatState.apiModels.map((model) => ({ ...model, apiMode: 'gemini-native' as const }));
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
  }, [appSettings.openaiCompatibleModels, chatState.apiModels]);
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
      handleSelectModelInHeader(modelId);
    },
    [geminiModelIds, handleSelectModelInHeader, isOpenAICompatibleMode, openAICompatibleModelIds, setAppSettings],
  );

  const sidebarProps = useMemo(
    () => ({
      isOpen: uiState.isHistorySidebarOpen,
      onToggle: toggleHistorySidebar,
      onAutoClose: () => setIsHistorySidebarOpenTransient(false),
      sessions: chatState.savedSessions,
      groups: chatState.savedGroups,
      activeSessionId: chatState.activeSessionId,
      loadingSessionIds: chatState.loadingSessionIds,
      generatingTitleSessionIds: chatState.generatingTitleSessionIds,
      onSelectSession: selectSession,
      onNewChat: chatState.startNewChat,
      onDeleteSession: chatState.handleDeleteChatHistorySession,
      onRenameSession: chatState.handleRenameSession,
      onTogglePinSession: chatState.handleTogglePinCurrentSession,
      onDuplicateSession: chatState.handleDuplicateSession,
      onOpenExportModal: openExportModal,
      onAddNewGroup: chatState.handleAddNewGroup,
      onDeleteGroup: chatState.handleDeleteGroup,
      onRenameGroup: chatState.handleRenameGroup,
      onMoveSessionToGroup: chatState.handleMoveSessionToGroup,
      onToggleGroupExpansion: chatState.handleToggleGroupExpansion,
      onOpenSettingsModal: openSettingsModal,
      themeId: currentTheme.id,
      newChatShortcut: getShortcutDisplay('general.newChat', appSettings),
      searchChatsShortcut: getShortcutDisplay('general.searchChats', appSettings),
    }),
    [
      appSettings,
      chatState.activeSessionId,
      chatState.generatingTitleSessionIds,
      chatState.handleAddNewGroup,
      chatState.handleDeleteChatHistorySession,
      chatState.handleDeleteGroup,
      chatState.handleDuplicateSession,
      chatState.handleMoveSessionToGroup,
      chatState.handleRenameGroup,
      chatState.handleRenameSession,
      chatState.handleToggleGroupExpansion,
      chatState.handleTogglePinCurrentSession,
      chatState.loadingSessionIds,
      chatState.savedGroups,
      chatState.savedSessions,
      chatState.startNewChat,
      currentTheme.id,
      openExportModal,
      openSettingsModal,
      selectSession,
      setIsHistorySidebarOpenTransient,
      toggleHistorySidebar,
      uiState.isHistorySidebarOpen,
    ],
  );

  const appModalsProps = useMemo(
    () => ({
      isSettingsModalOpen,
      setIsSettingsModalOpen,
      appSettings,
      availableModels: chatState.apiModels,
      handleSaveSettings,
      handleSaveCurrentChatSettings,
      clearCacheAndReload: chatState.clearCacheAndReload,
      clearAllHistory: chatState.clearAllHistory,
      handleInstallPwa: eventsState.handleInstallPwa,
      installState: eventsState.installState.state,
      handleImportSettings,
      handleExportSettings,
      handleImportHistory,
      handleExportHistory,
      handleImportAllScenarios,
      handleExportAllScenarios,
      isPreloadedMessagesModalOpen,
      setIsPreloadedMessagesModalOpen,
      savedScenarios: chatState.savedScenarios,
      handleSaveAllScenarios: chatState.handleSaveAllScenarios,
      handleLoadPreloadedScenario: chatState.handleLoadPreloadedScenario,
      isExportModalOpen,
      setIsExportModalOpen,
      handleExportChat,
      exportStatus,
      isLogViewerOpen,
      setIsLogViewerOpen,
      currentChatSettings: chatState.currentChatSettings,
      activeSessionId: chatState.activeSessionId,
      setAvailableModels: chatState.setApiModels,
    }),
    [
      chatState.apiModels,
      chatState.clearAllHistory,
      chatState.clearCacheAndReload,
      chatState.currentChatSettings,
      chatState.handleLoadPreloadedScenario,
      chatState.handleSaveAllScenarios,
      chatState.savedScenarios,
      chatState.setApiModels,
      eventsState.handleInstallPwa,
      eventsState.installState.state,
      exportStatus,
      handleExportAllScenarios,
      handleExportChat,
      handleExportHistory,
      handleExportSettings,
      handleImportAllScenarios,
      handleImportHistory,
      handleImportSettings,
      handleSaveCurrentChatSettings,
      handleSaveSettings,
      isExportModalOpen,
      isLogViewerOpen,
      isPreloadedMessagesModalOpen,
      isSettingsModalOpen,
      setIsExportModalOpen,
      setIsLogViewerOpen,
      setIsPreloadedMessagesModalOpen,
      setIsSettingsModalOpen,
      appSettings,
      chatState.activeSessionId,
    ],
  );

  const chatArea: ChatAreaProps['chatArea'] = useMemo(
    () => ({
      session: {
        activeSessionId: chatState.activeSessionId,
        sessionTitle,
        currentChatSettings: chatState.currentChatSettings,
        messages: chatState.messages,
        isLoading: chatState.isLoading,
        isEditing: !!chatState.editingMessageId,
        showThoughts: chatState.currentChatSettings.showThoughts,
      },
      shell: {
        isAppDraggingOver: chatState.isAppDraggingOver,
        modelsLoadingError: null,
        handleAppDragEnter: chatState.handleAppDragEnter,
        handleAppDragOver: chatState.handleAppDragOver,
        handleAppDragLeave: chatState.handleAppDragLeave,
        handleAppDrop: chatState.handleAppDrop,
      },
      header: {
        currentModelName,
        availableModels: headerAvailableModels,
        selectedModelId: headerSelectedModelId,
        isCanvasPromptActive,
        isCanvasPromptBusy,
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
      },
      messageActions,
      inputActions,
      features: {
        isImageEditModel: !isOpenAICompatibleMode && chatState.currentChatSettings.modelId?.includes('image-preview'),
        isBBoxModeActive:
          !isOpenAICompatibleMode && isBboxSystemInstruction(chatState.currentChatSettings.systemInstruction),
        isGuideModeActive:
          !isOpenAICompatibleMode && isHdGuideSystemInstruction(chatState.currentChatSettings.systemInstruction),
        generateQuadImages: appSettings.generateQuadImages ?? false,
        isGoogleSearchEnabled: !isOpenAICompatibleMode && !!chatState.currentChatSettings.isGoogleSearchEnabled,
        isCodeExecutionEnabled: !isOpenAICompatibleMode && !!chatState.currentChatSettings.isCodeExecutionEnabled,
        isLocalPythonEnabled: !isOpenAICompatibleMode && !!chatState.currentChatSettings.isLocalPythonEnabled,
        isUrlContextEnabled: !isOpenAICompatibleMode && !!chatState.currentChatSettings.isUrlContextEnabled,
        isDeepSearchEnabled: !isOpenAICompatibleMode && !!chatState.currentChatSettings.isDeepSearchEnabled,
      },
    }),
    [
      appSettings,
      chatState.activeSessionId,
      chatState.currentChatSettings,
      chatState.editingMessageId,
      chatState.handleAppDragEnter,
      chatState.handleAppDragLeave,
      chatState.handleAppDragOver,
      chatState.handleAppDrop,
      handleHeaderSelectModel,
      headerAvailableModels,
      headerSelectedModelId,
      isOpenAICompatibleMode,
      chatState.isAppDraggingOver,
      chatState.isLoading,
      chatState.messages,
      chatState.startNewChat,
      currentModelName,
      handleLoadCanvasPromptAndSave,
      handleSetThinkingLevel,
      inputActions,
      isCanvasPromptActive,
      isCanvasPromptBusy,
      messageActions,
      onToggleGemmaReasoning,
      openScenariosModal,
      pipState.isPipActive,
      pipState.isPipSupported,
      pipState.togglePip,
      sessionTitle,
      toggleHistorySidebar,
    ],
  );

  const sidePanelKey = useMemo(() => buildSidePanelKey(sidePanelContent), [sidePanelContent]);

  return {
    chatArea,
    sidebarProps,
    appModalsProps,
    sidePanelContent,
    handleCloseSidePanel,
    sidePanelKey,
    overlayVisible: uiState.isHistorySidebarOpen,
    currentThemeId: currentTheme.id,
    closeHistorySidebar,
  };
};
