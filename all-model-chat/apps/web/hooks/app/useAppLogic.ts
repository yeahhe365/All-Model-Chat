


import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppSettings } from '../core/useAppSettings';
import { useChat } from '../chat/useChat';
import { useAppUI } from '../core/useAppUI';
import { useAppEvents } from '../core/useAppEvents';
import { usePictureInPicture } from '../core/usePictureInPicture';
import { useDataManagement } from '../useDataManagement';
import { getTranslator, applyThemeToDocument, logService } from '../../utils/appUtils';

// Import new modularized hooks
import { useAppInitialization } from './logic/useAppInitialization';
import { useAppTitle } from './logic/useAppTitle';
import { useAppSidePanel } from './logic/useAppSidePanel';
import { useAppHandlers } from './logic/useAppHandlers';

export const useAppLogic = () => {
  const { appSettings, setAppSettings, currentTheme, language } = useAppSettings();
  const t = useMemo(() => getTranslator(language), [language]);

  // 1. Initialization
  useAppInitialization(appSettings);

  const chatState = useChat(appSettings, setAppSettings, language);
  
  const uiState = useAppUI();
  const { setIsHistorySidebarOpen } = uiState;
  
  // 2. Side Panel Logic
  const { sidePanelContent, handleOpenSidePanel, handleCloseSidePanel } = useAppSidePanel(setIsHistorySidebarOpen);

  // 3. PiP Logic
  const pipState = usePictureInPicture(uiState.setIsHistorySidebarOpen);

  // Sync styles to PiP window when theme changes
  useEffect(() => {
    if (pipState.pipWindow && pipState.pipWindow.document) {
        applyThemeToDocument(pipState.pipWindow.document, currentTheme, appSettings);
    }
  }, [pipState.pipWindow, currentTheme, appSettings]);

  // 4. App Events (Shortcuts, PWA)
  const eventsState = useAppEvents({
    appSettings,
    startNewChat: chatState.startNewChat,
    handleClearCurrentChat: chatState.handleClearCurrentChat,
    currentChatSettings: chatState.currentChatSettings,
    handleSelectModelInHeader: chatState.handleSelectModelInHeader,
    isSettingsModalOpen: uiState.isSettingsModalOpen,
    isPreloadedMessagesModalOpen: uiState.isPreloadedMessagesModalOpen,
    setIsLogViewerOpen: uiState.setIsLogViewerOpen,
    onTogglePip: pipState.togglePip,
    isPipSupported: pipState.isPipSupported,
    pipWindow: pipState.pipWindow,
    isLoading: chatState.isLoading,
    onStopGenerating: chatState.handleStopGenerating
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting'>('idle');
  
  const activeChat = chatState.savedSessions.find(s => s.id === chatState.activeSessionId);
  const sessionTitle = activeChat?.title || t('newChat');

  // 5. Title & Timer Logic
  useAppTitle({
      isLoading: chatState.isLoading,
      messages: chatState.messages,
      language,
      sessionTitle
  });

  // 6. Data Management
  const dataManagement = useDataManagement({
    appSettings, 
    setAppSettings, 
    savedSessions: chatState.savedSessions, 
    updateAndPersistSessions: chatState.updateAndPersistSessions,
    savedGroups: chatState.savedGroups, 
    updateAndPersistGroups: chatState.updateAndPersistGroups, 
    savedScenarios: chatState.savedScenarios, 
    handleSaveAllScenarios: chatState.handleSaveAllScenarios,
    t, 
    activeChat, 
    scrollContainerRef: chatState.scrollContainerRef, 
    currentTheme, 
    language,
  });

  const handleExportChat = useCallback(async (format: 'png' | 'html' | 'txt' | 'json') => {
    if (!activeChat) return;
    setExportStatus('exporting');
    try {
      await dataManagement.exportChatLogic(format);
    } catch (error) {
        logService.error(`Chat export failed (format: ${format})`, { error });
        alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setExportStatus('idle');
        setIsExportModalOpen(false);
    }
  }, [activeChat, dataManagement]);

  // 7. Core Handlers
  const {
      handleSaveSettings,
      handleLoadCanvasPromptAndSave,
      handleToggleBBoxMode,
      handleToggleGuideMode,
      handleSuggestionClick,
      handleSetThinkingLevel,
      getCurrentModelDisplayName
  } = useAppHandlers({
      setAppSettings,
      activeSessionId: chatState.activeSessionId,
      setCurrentChatSettings: chatState.setCurrentChatSettings,
      currentChatSettings: chatState.currentChatSettings,
      appSettings,
      chatState,
      t
  });

  return {
    appSettings, setAppSettings, currentTheme, language, t,
    chatState, uiState, pipState, eventsState, dataManagement,
    sidePanelContent, handleOpenSidePanel, handleCloseSidePanel,
    isExportModalOpen, setIsExportModalOpen, exportStatus, handleExportChat,
    activeChat, sessionTitle,
    handleSaveSettings,
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    handleSetThinkingLevel,
    getCurrentModelDisplayName
  };
};