import { useCallback, useMemo } from 'react';

import type { AppViewModel } from '@/hooks/app/useApp';
import { useUIStore } from '@/stores/uiStore';
import { getShortcutDisplay } from '@/utils/shortcutUtils';
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
    eventsState,
    sidePanelContent,
    handleCloseSidePanel,
    isExportModalOpen,
    setIsExportModalOpen,
    exportStatus,
    handleExportChat,
    handleSaveSettings,
    handleSaveCurrentChatSettings,
    handleExportAllScenarios,
    handleImportAllScenarios,
  } = app;
  const { setIsHistorySidebarOpen, setIsHistorySidebarOpenTransient } = uiState;
  const { loadChatSession } = chatState;

  const isSettingsModalOpen = useUIStore((state) => state.isSettingsModalOpen);
  const setIsSettingsModalOpen = useUIStore((state) => state.setIsSettingsModalOpen);
  const isPreloadedMessagesModalOpen = useUIStore((state) => state.isPreloadedMessagesModalOpen);
  const setIsPreloadedMessagesModalOpen = useUIStore((state) => state.setIsPreloadedMessagesModalOpen);
  const isLogViewerOpen = useUIStore((state) => state.isLogViewerOpen);
  const setIsLogViewerOpen = useUIStore((state) => state.setIsLogViewerOpen);

  const openSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, [setIsSettingsModalOpen]);

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
      handleImportAllScenarios,
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

  const sidePanelKey = useMemo(() => buildSidePanelKey(sidePanelContent), [sidePanelContent]);

  return {
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
