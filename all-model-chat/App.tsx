
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AppSettings, ChatGroup, SavedChatSession, ChatMessage, SideViewContent } from './types';
import { CANVAS_SYSTEM_PROMPT, DEFAULT_SYSTEM_INSTRUCTION, DEFAULT_APP_SETTINGS } from './constants/appConstants';
import { useAppSettings } from './hooks/useAppSettings';
import { useChat } from './hooks/useChat';
import { useAppUI } from './hooks/useAppUI';
import { useAppEvents } from './hooks/useAppEvents';
import { usePictureInPicture } from './hooks/usePictureInPicture';
import { useDataManagement } from './hooks/useDataManagement';
import { getTranslator, logService, applyThemeToDocument } from './utils/appUtils';
import { WindowProvider } from './contexts/WindowContext';
import { MainContent } from './components/layout/MainContent';
import { PiPPlaceholder } from './components/layout/PiPPlaceholder';
import { EditMessageModal } from './components/modals/EditMessageModal';
import { networkInterceptor } from './services/networkInterceptor';

const App: React.FC = () => {
  const { appSettings, setAppSettings, currentTheme, language } = useAppSettings();
  const t = useMemo(() => getTranslator(language), [language]);
  
  // Initialize Network Interceptor
  useEffect(() => {
      networkInterceptor.mount();
  }, []);

  // Update Interceptor Configuration when settings change
  useEffect(() => {
      const shouldUseProxy = appSettings.useCustomApiConfig && appSettings.useApiProxy;
      networkInterceptor.configure(!!shouldUseProxy, appSettings.apiProxyUrl);
  }, [appSettings.useCustomApiConfig, appSettings.useApiProxy, appSettings.apiProxyUrl]);

  const chatState = useChat(appSettings, setAppSettings, language);
  const {
      messages, isLoading, loadingSessionIds, generatingTitleSessionIds,
      currentChatSettings, commandedInput, setCommandedInput,
      selectedFiles, setSelectedFiles, editingMessageId,
      appFileError, setAppFileError, isAppProcessingFile,
      savedSessions, savedGroups, activeSessionId,
      apiModels, isSwitchingModel, setApiModels,
      scrollContainerRef, setScrollContainerRef, savedScenarios, isAppDraggingOver, isProcessingDrop,
      aspectRatio, setAspectRatio, ttsMessageId,
      loadChatSession, startNewChat, handleClearCurrentChat,
      handleSelectModelInHeader, handleProcessAndAddFiles, handleSendMessage,
      handleStopGenerating, handleEditMessage, handleCancelEdit,
      handleDeleteMessage, handleRetryMessage, handleRetryLastTurn,
      handleEditLastUserMessage, handleDeleteChatHistorySession, handleRenameSession,
      handleTogglePinSession, handleDuplicateSession, handleTogglePinCurrentSession, handleAddNewGroup,
      handleDeleteGroup, handleRenameGroup, handleMoveSessionToGroup,
      handleToggleGroupExpansion, clearCacheAndReload, clearAllHistory,
      handleSaveAllScenarios, handleLoadPreloadedScenario,
      onScrollContainerScroll: handleScroll, handleAppDragEnter,
      handleAppDragOver, handleAppDragLeave, handleAppDrop,
      handleCancelFileUpload, handleAddFileById, handleTextToSpeech,
      handleTranscribeAudio, setCurrentChatSettings, scrollNavVisibility,
      scrollToPrevTurn, scrollToNextTurn, toggleGoogleSearch,
      toggleCodeExecution, toggleUrlContext, toggleDeepSearch,
      updateAndPersistSessions, updateAndPersistGroups,
      imageSize, setImageSize, handleUpdateMessageContent, handleUpdateMessageFile
  } = chatState;

  const {
    isSettingsModalOpen, setIsSettingsModalOpen,
    isPreloadedMessagesModalOpen, setIsPreloadedMessagesModalOpen,
    isHistorySidebarOpen, setIsHistorySidebarOpen,
    isLogViewerOpen, setIsLogViewerOpen,
    handleTouchStart, handleTouchEnd,
  } = useAppUI();
  
  // Side Panel State
  const [sidePanelContent, setSidePanelContent] = useState<SideViewContent | null>(null);
  
  const handleOpenSidePanel = useCallback((content: SideViewContent) => {
      setSidePanelContent(content);
      // Auto-collapse sidebar on smaller screens if opening side panel
      if (window.innerWidth < 1280) {
          setIsHistorySidebarOpen(false);
      }
  }, [setIsHistorySidebarOpen]);

  const handleCloseSidePanel = useCallback(() => {
      setSidePanelContent(null);
  }, []);

  // Close SidePanel on window resize if width is too narrow
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth < 768) {
              setSidePanelContent(null);
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { isPipSupported, isPipActive, togglePip, pipContainer, pipWindow } = usePictureInPicture(setIsHistorySidebarOpen);

  // Sync styles to PiP window when theme changes
  useEffect(() => {
    if (pipWindow && pipWindow.document) {
        applyThemeToDocument(pipWindow.document, currentTheme, appSettings);
    }
  }, [pipWindow, currentTheme, appSettings]);

  const { installPromptEvent, isStandalone, handleInstallPwa } = useAppEvents({
    appSettings, startNewChat, handleClearCurrentChat,
    currentChatSettings, handleSelectModelInHeader,
    isSettingsModalOpen, isPreloadedMessagesModalOpen,
    setIsLogViewerOpen, onTogglePip: togglePip, isPipSupported,
    pipWindow // Pass the PiP window to attach shortcut listeners
  });

  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [exportStatus, setExportStatus] = React.useState<'idle' | 'exporting'>('idle');
  
  // Message Editing State
  const [editingContentMessage, setEditingContentMessage] = useState<ChatMessage | null>(null);

  const activeChat = savedSessions.find(s => s.id === activeSessionId);
  const sessionTitle = activeChat?.title || t('newChat');

  const {
    handleExportSettings, handleExportHistory, handleExportAllScenarios,
    handleImportSettings, handleImportHistory, handleImportAllScenarios,
    exportChatLogic,
  } = useDataManagement({
    appSettings, setAppSettings, savedSessions, updateAndPersistSessions,
    savedGroups, updateAndPersistGroups, savedScenarios, handleSaveAllScenarios,
    t, activeChat, scrollContainerRef, currentTheme, language,
  });

  const handleExportChat = React.useCallback(async (format: 'png' | 'html' | 'txt' | 'json') => {
    if (!activeChat) return;
    setExportStatus('exporting');
    try {
      await exportChatLogic(format);
    } catch (error) {
        logService.error(`Chat export failed (format: ${format})`, { error });
        alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setExportStatus('idle');
        setIsExportModalOpen(false);
    }
  }, [activeChat, exportChatLogic]);

  useEffect(() => {
    logService.info('App initialized.');
  }, []);
  
  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    if (activeSessionId && setCurrentChatSettings) {
      setCurrentChatSettings(prevChatSettings => ({
        ...prevChatSettings,
        modelId: newSettings.modelId, // Sync model change to active session
        temperature: newSettings.temperature,
        topP: newSettings.topP,
        systemInstruction: newSettings.systemInstruction,
        showThoughts: newSettings.showThoughts,
        ttsVoice: newSettings.ttsVoice,
        thinkingBudget: newSettings.thinkingBudget,
        thinkingLevel: newSettings.thinkingLevel,
        lockedApiKey: null,
        mediaResolution: newSettings.mediaResolution,
      }));
    }
  };

  const handleLoadCanvasPromptAndSave = () => {
    const isCurrentlyCanvasPrompt = currentChatSettings.systemInstruction === CANVAS_SYSTEM_PROMPT;
    const newSystemInstruction = isCurrentlyCanvasPrompt ? DEFAULT_SYSTEM_INSTRUCTION : CANVAS_SYSTEM_PROMPT;
    setAppSettings(prev => ({...prev, systemInstruction: newSystemInstruction}));
    if (activeSessionId && setCurrentChatSettings) {
      setCurrentChatSettings(prevSettings => ({ ...prevSettings, systemInstruction: newSystemInstruction }));
    }
  };
  
  const handleSuggestionClick = (type: 'homepage' | 'organize' | 'follow-up', text: string) => {
    if (type === 'organize') {
        if (currentChatSettings.systemInstruction !== CANVAS_SYSTEM_PROMPT) {
            const newSystemInstruction = CANVAS_SYSTEM_PROMPT;
            setAppSettings(prev => ({...prev, systemInstruction: newSystemInstruction}));
            if (activeSessionId && setCurrentChatSettings) {
              setCurrentChatSettings(prevSettings => ({ ...prevSettings, systemInstruction: newSystemInstruction }));
            }
        }
    }
    if (type === 'follow-up' && (appSettings.isAutoSendOnSuggestionClick ?? true)) {
        handleSendMessage({ text });
    } else {
        setCommandedInput({ text: text + '\n', id: Date.now() });
        setTimeout(() => {
            const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
            if (textarea) textarea.focus();
        }, 0);
    }
  };

  const handleSetThinkingLevel = (level: 'LOW' | 'HIGH') => {
    // 1. Update Global Settings (Persist)
    setAppSettings(prev => ({ ...prev, thinkingLevel: level }));

    // 2. Update Current Session Settings (Immediate)
    if (activeSessionId && setCurrentChatSettings) {
      setCurrentChatSettings(prev => ({ ...prev, thinkingLevel: level }));
    }
  };

  const getCurrentModelDisplayName = () => {
    const modelIdToDisplay = currentChatSettings.modelId || appSettings.modelId;
    if (isSwitchingModel) return t('appSwitchingModel');
    const model = apiModels.find(m => m.id === modelIdToDisplay);
    if (model) return model.name;
    if (modelIdToDisplay) { 
        let n = modelIdToDisplay.split('/').pop()?.replace('gemini-','Gemini ') || modelIdToDisplay; 
        return n.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').replace(' Preview ',' Preview ');
    }
    return apiModels.length === 0 ? t('appNoModelsAvailable') : t('appNoModelSelected');
  };

  const isCanvasPromptActive = currentChatSettings.systemInstruction === CANVAS_SYSTEM_PROMPT;
  const isImagenModel = currentChatSettings.modelId?.includes('imagen');
  const isImageEditModel = currentChatSettings.modelId?.includes('image-preview');

  // Construct props for sub-components
  const sidebarProps = {
    isOpen: isHistorySidebarOpen,
    onToggle: () => setIsHistorySidebarOpen(prev => !prev),
    sessions: savedSessions,
    groups: savedGroups,
    activeSessionId,
    loadingSessionIds,
    generatingTitleSessionIds,
    onSelectSession: (id: string) => loadChatSession(id, savedSessions),
    onNewChat: () => startNewChat(),
    onDeleteSession: handleDeleteChatHistorySession,
    onRenameSession: handleRenameSession,
    onTogglePinSession: handleTogglePinSession,
    onDuplicateSession: handleDuplicateSession,
    onOpenExportModal: () => setIsExportModalOpen(true),
    onAddNewGroup: handleAddNewGroup,
    onDeleteGroup: handleDeleteGroup,
    onRenameGroup: handleRenameGroup,
    onMoveSessionToGroup: handleMoveSessionToGroup,
    onToggleGroupExpansion: handleToggleGroupExpansion,
    onOpenSettingsModal: () => setIsSettingsModalOpen(true),
    onOpenScenariosModal: () => setIsPreloadedMessagesModalOpen(true),
    themeColors: currentTheme.colors,
    t,
    themeId: currentTheme.id,
    language,
  };

  const chatAreaProps = {
    activeSessionId,
    sessionTitle,
    currentChatSettings,
    setAppFileError,
    isAppDraggingOver,
    isProcessingDrop,
    handleAppDragEnter,
    handleAppDragOver,
    handleAppDragLeave,
    handleAppDrop,
    onNewChat: () => startNewChat(),
    onOpenSettingsModal: () => setIsSettingsModalOpen(true),
    onOpenScenariosModal: () => setIsPreloadedMessagesModalOpen(true),
    onToggleHistorySidebar: () => setIsHistorySidebarOpen(prev => !prev),
    isLoading,
    currentModelName: getCurrentModelDisplayName(),
    availableModels: apiModels,
    selectedModelId: currentChatSettings.modelId || appSettings.modelId,
    onSelectModel: handleSelectModelInHeader,
    isSwitchingModel,
    isHistorySidebarOpen,
    onLoadCanvasPrompt: handleLoadCanvasPromptAndSave,
    isCanvasPromptActive,
    isKeyLocked: !!currentChatSettings.lockedApiKey,
    themeId: currentTheme.id,
    modelsLoadingError: null,
    messages,
    scrollContainerRef,
    setScrollContainerRef, // Pass the new ref callback
    onScrollContainerScroll: handleScroll,
    onEditMessage: handleEditMessage,
    onDeleteMessage: handleDeleteMessage,
    onRetryMessage: handleRetryMessage,
    onEditMessageContent: setEditingContentMessage,
    onUpdateMessageFile: handleUpdateMessageFile, // Added this prop
    showThoughts: currentChatSettings.showThoughts,
    themeColors: currentTheme.colors,
    baseFontSize: appSettings.baseFontSize,
    expandCodeBlocksByDefault: appSettings.expandCodeBlocksByDefault,
    isMermaidRenderingEnabled: appSettings.isMermaidRenderingEnabled,
    isGraphvizRenderingEnabled: appSettings.isGraphvizRenderingEnabled ?? true,
    onSuggestionClick: (text: string) => handleSuggestionClick('homepage', text),
    onOrganizeInfoClick: (text: string) => handleSuggestionClick('organize', text),
    onFollowUpSuggestionClick: (text: string) => handleSuggestionClick('follow-up', text),
    onTextToSpeech: handleTextToSpeech,
    ttsMessageId,
    language,
    scrollNavVisibility,
    onScrollToPrevTurn: scrollToPrevTurn,
    onScrollToNextTurn: scrollToNextTurn,
    appSettings,
    commandedInput,
    setCommandedInput,
    onMessageSent: () => setCommandedInput(null),
    selectedFiles,
    setSelectedFiles,
    onSendMessage: (text: string) => handleSendMessage({ text }),
    isEditing: !!editingMessageId,
    onStopGenerating: handleStopGenerating,
    onCancelEdit: handleCancelEdit,
    onProcessFiles: handleProcessAndAddFiles,
    onAddFileById: handleAddFileById,
    onCancelUpload: handleCancelFileUpload,
    onTranscribeAudio: handleTranscribeAudio,
    isProcessingFile: isAppProcessingFile,
    fileError: appFileError,
    isImagenModel,
    isImageEditModel,
    aspectRatio,
    setAspectRatio,
    imageSize,
    setImageSize,
    isGoogleSearchEnabled: !!currentChatSettings.isGoogleSearchEnabled,
    onToggleGoogleSearch: toggleGoogleSearch,
    isCodeExecutionEnabled: !!currentChatSettings.isCodeExecutionEnabled,
    onToggleCodeExecution: toggleCodeExecution,
    isUrlContextEnabled: !!currentChatSettings.isUrlContextEnabled,
    onToggleUrlContext: toggleUrlContext,
    isDeepSearchEnabled: !!currentChatSettings.isDeepSearchEnabled,
    onToggleDeepSearch: toggleDeepSearch,
    onClearChat: handleClearCurrentChat,
    onOpenSettings: () => setIsSettingsModalOpen(true),
    onToggleCanvasPrompt: handleLoadCanvasPromptAndSave,
    onTogglePinCurrentSession: handleTogglePinCurrentSession,
    onRetryLastTurn: handleRetryLastTurn,
    onEditLastUserMessage: handleEditLastUserMessage,
    onOpenLogViewer: () => setIsLogViewerOpen(true),
    onClearAllHistory: clearAllHistory,
    isPipSupported,
    isPipActive,
    onTogglePip: togglePip,
    generateQuadImages: appSettings.generateQuadImages ?? false,
    onToggleQuadImages: () => setAppSettings(prev => ({ ...prev, generateQuadImages: !prev.generateQuadImages })),
    onSetThinkingLevel: handleSetThinkingLevel,
    setCurrentChatSettings,
    onOpenSidePanel: handleOpenSidePanel,
    t,
  };

  // Merge active chat settings into app settings for the modal so controls reflect current session
  const settingsForModal = useMemo(() => {
    if (activeSessionId && currentChatSettings) {
        // Explicitly pick only the settings that should be overridable by the session
        // This prevents dirty DB data from overwriting global UI settings
        const {
            modelId,
            temperature,
            topP,
            showThoughts,
            systemInstruction,
            ttsVoice,
            thinkingBudget,
            thinkingLevel,
            lockedApiKey,
            isGoogleSearchEnabled,
            isCodeExecutionEnabled,
            isUrlContextEnabled,
            isDeepSearchEnabled,
            safetySettings,
            mediaResolution
        } = currentChatSettings;

        return { 
            ...appSettings,
            // Only override these specific keys from the session
            modelId,
            temperature,
            topP,
            showThoughts,
            systemInstruction,
            ttsVoice,
            thinkingBudget,
            thinkingLevel,
            lockedApiKey,
            isGoogleSearchEnabled,
            isCodeExecutionEnabled,
            isUrlContextEnabled,
            isDeepSearchEnabled,
            safetySettings,
            mediaResolution
        };
    }
    return appSettings;
  }, [appSettings, currentChatSettings, activeSessionId]);

  const appModalsProps = {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    appSettings: settingsForModal, // Use merged settings
    availableModels: apiModels,
    handleSaveSettings,
    clearCacheAndReload,
    clearAllHistory,
    handleInstallPwa,
    installPromptEvent,
    isStandalone,
    handleImportSettings,
    handleExportSettings,
    handleImportHistory,
    handleExportHistory,
    handleImportAllScenarios,
    handleExportAllScenarios,
    isPreloadedMessagesModalOpen,
    setIsPreloadedMessagesModalOpen,
    savedScenarios,
    handleSaveAllScenarios,
    handleLoadPreloadedScenario,
    isExportModalOpen,
    setIsExportModalOpen,
    handleExportChat,
    exportStatus,
    isLogViewerOpen,
    setIsLogViewerOpen,
    currentChatSettings,
    t,
    setAvailableModels: setApiModels, // Added prop
  };

  return (
    <div 
      className={`relative flex h-full bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] theme-${currentTheme.id} overflow-hidden`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isPipActive && pipContainer && pipWindow ? (
          <>
              {createPortal(
                  <WindowProvider window={pipWindow} document={pipWindow.document}>
                    <div 
                        className={`theme-${currentTheme.id} h-full w-full flex relative bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]`}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        <MainContent
                            sidebarProps={sidebarProps}
                            chatAreaProps={chatAreaProps}
                            appModalsProps={appModalsProps}
                            isHistorySidebarOpen={isHistorySidebarOpen}
                            setIsHistorySidebarOpen={setIsHistorySidebarOpen}
                            sidePanelContent={sidePanelContent} // NEW
                            onCloseSidePanel={handleCloseSidePanel} // NEW
                            themeId={currentTheme.id}
                        />
                        <EditMessageModal
                            isOpen={!!editingContentMessage}
                            onClose={() => setEditingContentMessage(null)}
                            message={editingContentMessage}
                            onSave={handleUpdateMessageContent}
                            t={t}
                        />
                    </div>
                  </WindowProvider>,
                  pipContainer
              )}
              <PiPPlaceholder onClosePip={togglePip} />
          </>
      ) : (
          <WindowProvider>
            <MainContent
                sidebarProps={sidebarProps}
                chatAreaProps={chatAreaProps}
                appModalsProps={appModalsProps}
                isHistorySidebarOpen={isHistorySidebarOpen}
                setIsHistorySidebarOpen={setIsHistorySidebarOpen}
                sidePanelContent={sidePanelContent} // NEW
                onCloseSidePanel={handleCloseSidePanel} // NEW
                themeId={currentTheme.id}
            />
            <EditMessageModal
                isOpen={!!editingContentMessage}
                onClose={() => setEditingContentMessage(null)}
                message={editingContentMessage}
                onSave={handleUpdateMessageContent}
                t={t}
            />
          </WindowProvider>
      )}
    </div>
  );
};

export default App;
