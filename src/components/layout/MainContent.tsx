import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { HistorySidebar } from '../sidebar/HistorySidebar';
import { ChatArea, ChatAreaProps } from './ChatArea';
import { AppModals } from '../modals/AppModals';
import type { AppViewModel } from '../../hooks/app/useApp';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import {
  buildChatAreaModel,
  buildHistorySidebarProps,
  buildSettingsForModal,
  buildSidePanelKey,
  MainContentChatAreaHeaderActions,
  MainContentChatAreaShellHandlers,
} from './mainContentModels';

const LazySidePanel = lazy(async () => {
  const module = await import('./SidePanel');
  return { default: module.SidePanel };
});

interface MainContentProps {
  app: AppViewModel;
}

export const MainContent: React.FC<MainContentProps> = ({ app }) => {
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
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
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
  const { setIsHistorySidebarOpen } = uiState;
  const { loadChatSession, handleSendMessage } = chatState;

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
      loadChatSession(id);
    },
    [loadChatSession],
  );

  const openExportModal = useCallback(() => {
    setIsExportModalOpen(true);
  }, [setIsExportModalOpen]);

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
    (text: string, options?: { isFastMode?: boolean }) => {
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

  const headerActions: MainContentChatAreaHeaderActions = useMemo(
    () => ({
      onNewChat: chatState.startNewChat,
      onOpenScenariosModal: openScenariosModal,
      onToggleHistorySidebar: toggleHistorySidebar,
      onLoadCanvasPrompt: handleLoadCanvasPromptAndSave,
      onSelectModel: chatState.handleSelectModelInHeader,
      onSetThinkingLevel: handleSetThinkingLevel,
      onTogglePip: pipState.togglePip,
    }),
    [
      chatState.handleSelectModelInHeader,
      chatState.startNewChat,
      handleLoadCanvasPromptAndSave,
      handleSetThinkingLevel,
      openScenariosModal,
      pipState.togglePip,
      toggleHistorySidebar,
    ],
  );

  const shellHandlers: MainContentChatAreaShellHandlers = useMemo(
    () => ({
      handleAppDragEnter: chatState.handleAppDragEnter,
      handleAppDragOver: chatState.handleAppDragOver,
      handleAppDragLeave: chatState.handleAppDragLeave,
      handleAppDrop: chatState.handleAppDrop,
    }),
    [chatState.handleAppDragEnter, chatState.handleAppDragLeave, chatState.handleAppDragOver, chatState.handleAppDrop],
  );

  const messageActions: ChatAreaProps['chatArea']['messageActions'] = useMemo(
    () => ({
      setScrollContainerRef: chatState.setScrollContainerRef,
      onScrollContainerScroll: chatState.onScrollContainerScroll,
      onEditMessage: chatState.handleEditMessage,
      onDeleteMessage: chatState.handleDeleteMessage,
      onRetryMessage: chatState.handleRetryMessage,
      onUpdateMessageFile: chatState.handleUpdateMessageFile,
      onSuggestionClick,
      onOrganizeInfoClick,
      onFollowUpSuggestionClick,
      onGenerateCanvas: chatState.handleGenerateCanvas,
      onContinueGeneration: chatState.handleContinueGeneration,
      onQuickTTS: chatState.handleQuickTTS,
      onOpenSidePanel: handleOpenSidePanel,
    }),
    [
      chatState.handleContinueGeneration,
      chatState.handleDeleteMessage,
      chatState.handleEditMessage,
      chatState.handleGenerateCanvas,
      chatState.handleQuickTTS,
      chatState.handleRetryMessage,
      chatState.handleUpdateMessageFile,
      chatState.onScrollContainerScroll,
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

  const settingsForModal = useMemo(
    () =>
      buildSettingsForModal({
        appSettings,
        activeSessionId: chatState.activeSessionId,
        currentChatSettings: chatState.currentChatSettings,
      }),
    [appSettings, chatState.activeSessionId, chatState.currentChatSettings],
  );

  const sidebarProps = useMemo(
    () =>
      buildHistorySidebarProps({
        appSettings,
        isOpen: uiState.isHistorySidebarOpen,
        onToggle: toggleHistorySidebar,
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
      toggleHistorySidebar,
      uiState.isHistorySidebarOpen,
    ],
  );

  const appModalsProps = useMemo(
    () => ({
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        appSettings: settingsForModal,
        availableModels: chatState.apiModels,
        handleSaveSettings,
        clearCacheAndReload: chatState.clearCacheAndReload,
        clearAllHistory: chatState.clearAllHistory,
        handleInstallPwa: eventsState.handleInstallPwa,
        installPromptEvent: eventsState.installPromptEvent,
        isStandalone: eventsState.isStandalone,
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
      eventsState.installPromptEvent,
      eventsState.isStandalone,
      exportStatus,
      handleExportAllScenarios,
      handleExportChat,
      handleExportHistory,
      handleExportSettings,
      handleImportAllScenarios,
      handleImportHistory,
      handleImportSettings,
      handleSaveSettings,
      isExportModalOpen,
      isLogViewerOpen,
      isPreloadedMessagesModalOpen,
      isSettingsModalOpen,
      setIsExportModalOpen,
      setIsLogViewerOpen,
      setIsPreloadedMessagesModalOpen,
      setIsSettingsModalOpen,
      settingsForModal,
    ],
  );

  const chatArea: ChatAreaProps['chatArea'] = useMemo(
    () =>
      buildChatAreaModel({
        appSettings,
        sessionTitle,
        currentModelName,
        activeSessionId: chatState.activeSessionId,
        currentChatSettings: chatState.currentChatSettings,
        messages: chatState.messages,
        isLoading: chatState.isLoading,
        isEditing: !!chatState.editingMessageId,
        isAppDraggingOver: chatState.isAppDraggingOver,
        availableModels: chatState.apiModels,
        isPipSupported: pipState.isPipSupported,
        isPipActive: pipState.isPipActive,
        headerActions,
        shellHandlers,
        messageActions,
        inputActions,
      }),
    [
      appSettings,
      chatState.activeSessionId,
      chatState.apiModels,
      chatState.currentChatSettings,
      chatState.editingMessageId,
      chatState.isAppDraggingOver,
      chatState.isLoading,
      chatState.messages,
      currentModelName,
      headerActions,
      inputActions,
      messageActions,
      pipState.isPipActive,
      pipState.isPipSupported,
      sessionTitle,
      shellHandlers,
    ],
  );

  const sidePanelKey = useMemo(() => buildSidePanelKey(sidePanelContent), [sidePanelContent]);

  return (
    <>
      <div
        onClick={closeHistorySidebar}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden ${
          uiState.isHistorySidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      <HistorySidebar {...sidebarProps} />
      <ChatArea chatArea={chatArea} />

      {sidePanelContent && (
        <Suspense fallback={null}>
          <LazySidePanel
            key={sidePanelKey}
            content={sidePanelContent}
            onClose={handleCloseSidePanel}
            themeId={currentTheme.id}
          />
        </Suspense>
      )}

      <AppModals {...appModalsProps} />
    </>
  );
};
