
import { useMemo } from 'react';
import { useAppLogic } from '../useAppLogic';

export const useAppModalsProps = (logic: ReturnType<typeof useAppLogic>) => {
  const {
    appSettings,
    chatState,
    uiState,
    eventsState,
    dataManagement,
    t,
    handleSaveSettings,
    setIsExportModalOpen,
    isExportModalOpen,
    handleExportChat,
    exportStatus,
  } = logic;

  // Merge active chat settings into app settings for the modal so controls reflect current session
  const settingsForModal = useMemo(() => {
    if (chatState.activeSessionId && chatState.currentChatSettings) {
        // Spread global settings first, then overlay current session specific settings
        // This avoids manually listing every single property and ensures new props are handled automatically.
        const sessionOverrides = { ...chatState.currentChatSettings };

        // Explicitly remove global-only keys from the override object to prevent stale session data
        // from overwriting global settings (like API Config).
        // This is necessary because session settings might contain polluted data from creation time.
        delete (sessionOverrides as any).useCustomApiConfig;
        delete (sessionOverrides as any).apiKey;
        delete (sessionOverrides as any).apiProxyUrl;
        delete (sessionOverrides as any).useApiProxy;
        delete (sessionOverrides as any).themeId;
        delete (sessionOverrides as any).baseFontSize;
        delete (sessionOverrides as any).language;

        return { 
            ...appSettings,
            ...sessionOverrides
        };
    }
    return appSettings;
  }, [appSettings, chatState.currentChatSettings, chatState.activeSessionId]);

  return useMemo(() => ({
    isSettingsModalOpen: uiState.isSettingsModalOpen,
    setIsSettingsModalOpen: uiState.setIsSettingsModalOpen,
    appSettings: settingsForModal,
    availableModels: chatState.apiModels,
    handleSaveSettings,
    clearCacheAndReload: chatState.clearCacheAndReload,
    clearAllHistory: chatState.clearAllHistory,
    handleInstallPwa: eventsState.handleInstallPwa,
    installPromptEvent: eventsState.installPromptEvent,
    isStandalone: eventsState.isStandalone,
    handleImportSettings: dataManagement.handleImportSettings,
    handleExportSettings: dataManagement.handleExportSettings,
    handleImportHistory: dataManagement.handleImportHistory,
    handleExportHistory: dataManagement.handleExportHistory,
    handleImportAllScenarios: dataManagement.handleImportAllScenarios,
    handleExportAllScenarios: dataManagement.handleExportAllScenarios,
    isPreloadedMessagesModalOpen: uiState.isPreloadedMessagesModalOpen,
    setIsPreloadedMessagesModalOpen: uiState.setIsPreloadedMessagesModalOpen,
    savedScenarios: chatState.savedScenarios,
    handleSaveAllScenarios: chatState.handleSaveAllScenarios,
    handleLoadPreloadedScenario: chatState.handleLoadPreloadedScenario,
    isExportModalOpen,
    setIsExportModalOpen,
    handleExportChat,
    exportStatus,
    isLogViewerOpen: uiState.isLogViewerOpen,
    setIsLogViewerOpen: uiState.setIsLogViewerOpen,
    currentChatSettings: chatState.currentChatSettings,
    t,
    setAvailableModels: chatState.setApiModels,
  }), [
    uiState.isSettingsModalOpen,
    uiState.setIsSettingsModalOpen,
    settingsForModal,
    chatState.apiModels,
    chatState.clearCacheAndReload,
    chatState.clearAllHistory,
    chatState.savedScenarios,
    chatState.handleSaveAllScenarios,
    chatState.handleLoadPreloadedScenario,
    chatState.currentChatSettings,
    chatState.setApiModels,
    handleSaveSettings,
    eventsState.handleInstallPwa,
    eventsState.installPromptEvent,
    eventsState.isStandalone,
    dataManagement,
    uiState.isPreloadedMessagesModalOpen,
    uiState.setIsPreloadedMessagesModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    handleExportChat,
    exportStatus,
    uiState.isLogViewerOpen,
    uiState.setIsLogViewerOpen,
    t,
  ]);
};
