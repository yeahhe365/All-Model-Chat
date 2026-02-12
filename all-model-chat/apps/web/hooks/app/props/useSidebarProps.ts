
import { useMemo } from 'react';
import { useAppLogic } from '../useAppLogic';
import { getShortcutDisplay } from '../../../utils/shortcutUtils';

export const useSidebarProps = (logic: ReturnType<typeof useAppLogic>) => {
  const {
    appSettings,
    chatState,
    uiState,
    currentTheme,
    language,
    t,
    setIsExportModalOpen,
  } = logic;

  return useMemo(() => ({
    isOpen: uiState.isHistorySidebarOpen,
    onToggle: () => uiState.setIsHistorySidebarOpen(prev => !prev),
    sessions: chatState.savedSessions,
    groups: chatState.savedGroups,
    activeSessionId: chatState.activeSessionId,
    loadingSessionIds: chatState.loadingSessionIds,
    generatingTitleSessionIds: chatState.generatingTitleSessionIds,
    onSelectSession: (id: string) => { chatState.loadChatSession(id); },
    onNewChat: () => chatState.startNewChat(),
    onDeleteSession: chatState.handleDeleteChatHistorySession,
    onRenameSession: chatState.handleRenameSession,
    onTogglePinSession: chatState.handleTogglePinCurrentSession,
    onDuplicateSession: chatState.handleDuplicateSession,
    onOpenExportModal: () => setIsExportModalOpen(true),
    onAddNewGroup: chatState.handleAddNewGroup,
    onDeleteGroup: chatState.handleDeleteGroup,
    onRenameGroup: chatState.handleRenameGroup,
    onMoveSessionToGroup: chatState.handleMoveSessionToGroup,
    onToggleGroupExpansion: chatState.handleToggleGroupExpansion,
    onOpenSettingsModal: () => uiState.setIsSettingsModalOpen(true),
    onOpenScenariosModal: () => uiState.setIsPreloadedMessagesModalOpen(true),
    t,
    themeId: currentTheme.id,
    language,
    newChatShortcut: getShortcutDisplay('general.newChat', appSettings),
  }), [
    uiState.isHistorySidebarOpen, 
    uiState.setIsHistorySidebarOpen,
    uiState.setIsSettingsModalOpen,
    uiState.setIsPreloadedMessagesModalOpen,
    chatState.savedSessions, 
    chatState.savedGroups, 
    chatState.activeSessionId,
    chatState.loadingSessionIds, 
    chatState.generatingTitleSessionIds, 
    chatState.loadChatSession,
    chatState.startNewChat,
    chatState.handleDeleteChatHistorySession,
    chatState.handleRenameSession,
    chatState.handleTogglePinCurrentSession,
    chatState.handleDuplicateSession,
    chatState.handleAddNewGroup,
    chatState.handleDeleteGroup,
    chatState.handleRenameGroup,
    chatState.handleMoveSessionToGroup,
    chatState.handleToggleGroupExpansion,
    currentTheme, 
    language, 
    t, 
    appSettings,
    setIsExportModalOpen
  ]);
};
