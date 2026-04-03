import { useMemo } from 'react';
import { useAppLogic } from '../useAppLogic';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import { ChatSettings } from '../../../types';
import { useUIStore } from '../../../stores/uiStore';

export const useAppModalsProps = (logic: ReturnType<typeof useAppLogic>) => {
  const {
    appSettings,
    chatState,
    eventsState,
    dataManagement,
    t,
    handleSaveSettings,
    setIsExportModalOpen,
    isExportModalOpen,
    handleExportChat,
    exportStatus,
  } = logic;

  const isSettingsModalOpen = useUIStore((s) => s.isSettingsModalOpen);
  const setIsSettingsModalOpen = useUIStore((s) => s.setIsSettingsModalOpen);
  const isPreloadedMessagesModalOpen = useUIStore((s) => s.isPreloadedMessagesModalOpen);
  const setIsPreloadedMessagesModalOpen = useUIStore((s) => s.setIsPreloadedMessagesModalOpen);
  const isLogViewerOpen = useUIStore((s) => s.isLogViewerOpen);
  const setIsLogViewerOpen = useUIStore((s) => s.setIsLogViewerOpen);

  // Merge active chat settings into app settings for the modal so controls reflect current session
  const settingsForModal = useMemo(() => {
    if (chatState.activeSessionId && chatState.currentChatSettings) {
        const cleanSessionOverrides: any = {};

        (Object.keys(DEFAULT_CHAT_SETTINGS) as Array<keyof ChatSettings>).forEach(key => {
             if (Object.prototype.hasOwnProperty.call(chatState.currentChatSettings, key)) {
                 cleanSessionOverrides[key] = (chatState.currentChatSettings as any)[key];
             }
        });

        return {
            ...appSettings,
            ...cleanSessionOverrides
        };
    }
    return appSettings;
  }, [appSettings, chatState.currentChatSettings, chatState.activeSessionId]);

  return useMemo(() => ({
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
    handleImportSettings: dataManagement.handleImportSettings,
    handleExportSettings: dataManagement.handleExportSettings,
    handleImportHistory: dataManagement.handleImportHistory,
    handleExportHistory: dataManagement.handleExportHistory,
    handleImportAllScenarios: dataManagement.handleImportAllScenarios,
    handleExportAllScenarios: dataManagement.handleExportAllScenarios,
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
    t,
    setAvailableModels: chatState.setApiModels,
  }), [
    isSettingsModalOpen,
    setIsSettingsModalOpen,
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
    isPreloadedMessagesModalOpen,
    setIsPreloadedMessagesModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    handleExportChat,
    exportStatus,
    isLogViewerOpen,
    setIsLogViewerOpen,
    t,
  ]);
};
