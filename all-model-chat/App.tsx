import React, { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppSettings, SavedChatSession, SavedScenario, ChatGroup } from './types';
import { CANVAS_ASSISTANT_SYSTEM_PROMPT, DEFAULT_SYSTEM_INSTRUCTION } from './constants/appConstants';
import { HistorySidebar } from './components/HistorySidebar';
import { useAppSettings } from './hooks/useAppSettings';
import { useChat } from './hooks/useChat';
import { useAppUI } from './hooks/useAppUI';
import { useAppEvents } from './hooks/useAppEvents';
import { usePictureInPicture } from './hooks/usePictureInPicture';
import { useDataManagement } from './hooks/useDataManagement';
import { getTranslator, logService } from './utils/appUtils';
import mermaid from 'mermaid';
import { ChatArea } from './components/layout/ChatArea';
import { AppModals } from './components/modals/AppModals';
import { PictureInPicture2 } from 'lucide-react';


const App: React.FC = () => {
  const { appSettings, setAppSettings, currentTheme, language } = useAppSettings();
  const t = getTranslator(language);
  
  const chatState = useChat(appSettings, language);
  const {
      messages,
      isLoading,
      loadingSessionIds,
      generatingTitleSessionIds,
      currentChatSettings,
      commandedInput,
      setCommandedInput,
      selectedFiles,
      setSelectedFiles,
      editingMessageId,
      appFileError,
      setAppFileError,
      isAppProcessingFile,
      savedSessions,
      savedGroups,
      activeSessionId,
      apiModels,
      isModelsLoading,
      modelsLoadingError,
      isSwitchingModel,
      scrollContainerRef,
      savedScenarios,
      isAppDraggingOver,
      aspectRatio,
      setAspectRatio,
      ttsMessageId,
      loadChatSession,
      startNewChat,
      handleClearCurrentChat,
      handleSelectModelInHeader,
      handleProcessAndAddFiles,
      handleSendMessage,
      handleStopGenerating,
      handleEditMessage,
      handleCancelEdit,
      handleDeleteMessage,
      handleRetryMessage,
      handleRetryLastTurn,
      handleEditLastUserMessage,
      handleDeleteChatHistorySession,
      handleRenameSession,
      handleTogglePinSession,
      handleTogglePinCurrentSession,
      handleAddNewGroup,
      handleDeleteGroup,
      handleRenameGroup,
      handleMoveSessionToGroup,
      handleToggleGroupExpansion,
      clearCacheAndReload,
      clearAllHistory,
      handleSaveAllScenarios,
      handleLoadPreloadedScenario,
      onScrollContainerScroll: handleScroll,
      handleAppDragEnter,
      handleAppDragOver,
      handleAppDragLeave,
      handleAppDrop,
      handleCancelFileUpload,
      handleAddFileById,
      handleTextToSpeech,
      handleTranscribeAudio,
      setCurrentChatSettings,
      scrollNavVisibility,
      scrollToPrevTurn,
      scrollToNextTurn,
      toggleGoogleSearch,
      toggleCodeExecution,
      toggleUrlContext,
      updateAndPersistSessions,
      updateAndPersistGroups,
  } = chatState;

  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPreloadedMessagesModalOpen,
    setIsPreloadedMessagesModalOpen,
    isHistorySidebarOpen,
    setIsHistorySidebarOpen,
    isLogViewerOpen,
    setIsLogViewerOpen,
    handleTouchStart,
    handleTouchEnd,
  } = useAppUI();
  
  const { isPipSupported, isPipActive, togglePip, pipContainer } = usePictureInPicture(setIsHistorySidebarOpen);

  const {
    installPromptEvent,
    isStandalone,
    handleInstallPwa,
  } = useAppEvents({
    appSettings,
    startNewChat,
    handleClearCurrentChat,
    currentChatSettings,
    handleSelectModelInHeader,
    isSettingsModalOpen,
    isPreloadedMessagesModalOpen,
    setIsLogViewerOpen,
    onTogglePip: togglePip,
    isPipSupported,
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting'>('idle');
  const activeChat = savedSessions.find(s => s.id === activeSessionId);

  const {
    handleExportSettings,
    handleExportHistory,
    handleExportAllScenarios,
    handleImportSettings,
    handleImportHistory,
    handleImportAllScenarios,
    exportChatLogic,
  } = useDataManagement({
    appSettings,
    setAppSettings,
    savedSessions,
    updateAndPersistSessions,
    savedGroups,
    updateAndPersistGroups,
    savedScenarios,
    handleSaveAllScenarios,
    t,
    activeChat,
    scrollContainerRef,
    currentTheme,
    language,
  });

  const handleExportChat = useCallback(async (format: 'png' | 'html' | 'txt' | 'json') => {
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
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default', // Always use a light theme for diagrams for readability, rendered on a white background.
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    });
  }, []);
  
  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
  
    if (activeSessionId && setCurrentChatSettings) {
      setCurrentChatSettings(prevChatSettings => ({
        ...prevChatSettings,
        temperature: newSettings.temperature,
        topP: newSettings.topP,
        systemInstruction: newSettings.systemInstruction,
        showThoughts: newSettings.showThoughts,
        ttsVoice: newSettings.ttsVoice,
        thinkingBudget: newSettings.thinkingBudget,
        // When settings are saved, especially API settings, we must clear any
        // locked API key on the current session. This ensures the next request
        // uses the new global settings instead of an old, potentially invalid, locked key.
        lockedApiKey: null,
      }));
    }
    
    setIsSettingsModalOpen(false);
  };

  const handleSetDefaultModel = (modelId: string) => {
    logService.info(`Setting new default model: ${modelId}`);
    setAppSettings(prev => ({ ...prev, modelId }));
  };

  const handleLoadCanvasHelperPromptAndSave = () => {
    const isCurrentlyCanvasPrompt = currentChatSettings.systemInstruction === CANVAS_ASSISTANT_SYSTEM_PROMPT;
    const newSystemInstruction = isCurrentlyCanvasPrompt ? DEFAULT_SYSTEM_INSTRUCTION : CANVAS_ASSISTANT_SYSTEM_PROMPT;
    
    setAppSettings(prev => ({...prev, systemInstruction: newSystemInstruction}));

    if (activeSessionId && setCurrentChatSettings) {
      setCurrentChatSettings(prevSettings => ({
        ...prevSettings,
        systemInstruction: newSystemInstruction,
      }));
    }
  };
  
  const handleHomepageSuggestionClick = (text: string) => {
    setCommandedInput({ text: text + '\n', id: Date.now() });
    setTimeout(() => {
        const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
    }, 0);
  };

  const handleFollowUpSuggestionClick = (text: string) => {
    if (appSettings.isAutoSendOnSuggestionClick ?? true) {
      handleSendMessage({ text });
    } else {
      setCommandedInput({ text: text + '\n', id: Date.now() });
      setTimeout(() => {
          const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
          if (textarea) textarea.focus();
      }, 0);
    }
  };

  const getCurrentModelDisplayName = () => {
    const modelIdToDisplay = currentChatSettings.modelId || appSettings.modelId;
    if (isModelsLoading && !modelIdToDisplay && apiModels.length === 0) return t('loading');
    if (isModelsLoading && modelIdToDisplay && !apiModels.find(m => m.id === modelIdToDisplay)) return t('appVerifyingModel');
    if (isSwitchingModel) return t('appSwitchingModel');
    const model = apiModels.find(m => m.id === modelIdToDisplay);
    if (model) return model.name;
    if (modelIdToDisplay) { let n = modelIdToDisplay.split('/').pop()?.replace('gemini-','Gemini ') || modelIdToDisplay; return n.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').replace(' Preview ',' Preview ');}
    return apiModels.length === 0 && !isModelsLoading ? t('appNoModelsAvailable') : t('appNoModelSelected');
  };

  const isCanvasPromptActive = currentChatSettings.systemInstruction === CANVAS_ASSISTANT_SYSTEM_PROMPT;
  const isImagenModel = currentChatSettings.modelId?.includes('imagen');
  const isImageEditModel = currentChatSettings.modelId?.includes('image-preview');

  const chatAreaComponent = (
    <ChatArea
        isAppDraggingOver={isAppDraggingOver}
        handleAppDragEnter={handleAppDragEnter}
        handleAppDragOver={handleAppDragOver}
        handleAppDragLeave={handleAppDragLeave}
        handleAppDrop={handleAppDrop}
        onNewChat={() => startNewChat()}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenScenariosModal={() => setIsPreloadedMessagesModalOpen(true)}
        onToggleHistorySidebar={() => setIsHistorySidebarOpen(prev => !prev)}
        isLoading={isLoading}
        currentModelName={getCurrentModelDisplayName()}
        availableModels={apiModels}
        selectedModelId={currentChatSettings.modelId || appSettings.modelId}
        onSelectModel={handleSelectModelInHeader}
        isModelsLoading={isModelsLoading}
        isSwitchingModel={isSwitchingModel}
        isHistorySidebarOpen={isHistorySidebarOpen}
        onLoadCanvasPrompt={handleLoadCanvasHelperPromptAndSave}
        isCanvasPromptActive={isCanvasPromptActive}
        isKeyLocked={!!currentChatSettings.lockedApiKey}
        defaultModelId={appSettings.modelId}
        onSetDefaultModel={handleSetDefaultModel}
        themeId={currentTheme.id}
        modelsLoadingError={modelsLoadingError}
        messages={messages}
        scrollContainerRef={scrollContainerRef}
        onScrollContainerScroll={handleScroll}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onRetryMessage={handleRetryMessage}
        showThoughts={currentChatSettings.showThoughts}
        themeColors={currentTheme.colors}
        baseFontSize={appSettings.baseFontSize}
        expandCodeBlocksByDefault={appSettings.expandCodeBlocksByDefault}
        isMermaidRenderingEnabled={appSettings.isMermaidRenderingEnabled}
        isGraphvizRenderingEnabled={appSettings.isGraphvizRenderingEnabled ?? true}
        onSuggestionClick={handleHomepageSuggestionClick}
        onFollowUpSuggestionClick={handleFollowUpSuggestionClick}
        onTextToSpeech={handleTextToSpeech}
        ttsMessageId={ttsMessageId}
        language={language}
        scrollNavVisibility={scrollNavVisibility}
        onScrollToPrevTurn={scrollToPrevTurn}
        onScrollToNextTurn={scrollToNextTurn}
        appSettings={appSettings}
        currentChatSettings={currentChatSettings}
        setAppFileError={setAppFileError}
        activeSessionId={activeSessionId}
        commandedInput={commandedInput}
        setCommandedInput={setCommandedInput}
        onMessageSent={() => setCommandedInput(null)}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        onSendMessage={(text) => handleSendMessage({ text })}
        isEditing={!!editingMessageId}
        onStopGenerating={handleStopGenerating}
        onCancelEdit={handleCancelEdit}
        onProcessFiles={handleProcessAndAddFiles}
        onAddFileById={handleAddFileById}
        onCancelUpload={handleCancelFileUpload}
        onTranscribeAudio={handleTranscribeAudio}
        isProcessingFile={isAppProcessingFile}
        fileError={appFileError}
        isImagenModel={isImagenModel}
        isImageEditModel={isImageEditModel}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        isGoogleSearchEnabled={!!currentChatSettings.isGoogleSearchEnabled}
        onToggleGoogleSearch={toggleGoogleSearch}
        isCodeExecutionEnabled={!!currentChatSettings.isCodeExecutionEnabled}
        onToggleCodeExecution={toggleCodeExecution}
        isUrlContextEnabled={!!currentChatSettings.isUrlContextEnabled}
        onToggleUrlContext={toggleUrlContext}
        onClearChat={handleClearCurrentChat}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onToggleCanvasPrompt={handleLoadCanvasHelperPromptAndSave}
        onTogglePinCurrentSession={handleTogglePinCurrentSession}
        onRetryLastTurn={handleRetryLastTurn}
        onEditLastUserMessage={handleEditLastUserMessage}
        onOpenLogViewer={() => setIsLogViewerOpen(true)}
        onClearAllHistory={clearAllHistory}
        isPipSupported={isPipSupported}
        isPipActive={isPipActive}
        onTogglePip={togglePip}
        t={t}
      />
  );
  
  const fullAppComponent = (
    <>
      {isHistorySidebarOpen && (
        <div 
          onClick={() => setIsHistorySidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-20 transition-opacity duration-300 md:hidden"
          aria-hidden="true"
        />
      )}
      <HistorySidebar
        isOpen={isHistorySidebarOpen}
        onToggle={() => setIsHistorySidebarOpen(prev => !prev)}
        sessions={savedSessions}
        groups={savedGroups}
        activeSessionId={activeSessionId}
        loadingSessionIds={loadingSessionIds}
        generatingTitleSessionIds={generatingTitleSessionIds}
        onSelectSession={(id) => loadChatSession(id, savedSessions)}
        onNewChat={() => startNewChat()}
        onDeleteSession={handleDeleteChatHistorySession}
        onRenameSession={handleRenameSession}
        onTogglePinSession={handleTogglePinSession}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onAddNewGroup={handleAddNewGroup}
        onDeleteGroup={handleDeleteGroup}
        onRenameGroup={handleRenameGroup}
        onMoveSessionToGroup={handleMoveSessionToGroup}
        onToggleGroupExpansion={handleToggleGroupExpansion}
        themeColors={currentTheme.colors}
        t={t}
        themeId={currentTheme.id}
        language={language}
      />
      {chatAreaComponent}
      <AppModals
        isSettingsModalOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        appSettings={appSettings}
        availableModels={apiModels}
        handleSaveSettings={handleSaveSettings}
        isModelsLoading={isModelsLoading}
        modelsLoadingError={modelsLoadingError}
        clearCacheAndReload={clearCacheAndReload}
        clearAllHistory={clearAllHistory}
        handleInstallPwa={handleInstallPwa}
        installPromptEvent={installPromptEvent}
        isStandalone={isStandalone}
        handleImportSettings={handleImportSettings}
        handleExportSettings={handleExportSettings}
        handleImportHistory={handleImportHistory}
        handleExportHistory={handleExportHistory}
        handleImportAllScenarios={handleImportAllScenarios}
        handleExportAllScenarios={handleExportAllScenarios}
        isPreloadedMessagesModalOpen={isPreloadedMessagesModalOpen}
        setIsPreloadedMessagesModalOpen={setIsPreloadedMessagesModalOpen}
        savedScenarios={savedScenarios}
        handleSaveAllScenarios={handleSaveAllScenarios}
        handleLoadPreloadedScenario={handleLoadPreloadedScenario}
        isExportModalOpen={isExportModalOpen}
        setIsExportModalOpen={setIsExportModalOpen}
        handleExportChat={handleExportChat}
        exportStatus={exportStatus}
        isLogViewerOpen={isLogViewerOpen}
        setIsLogViewerOpen={setIsLogViewerOpen}
        currentChatSettings={currentChatSettings}
        t={t}
      />
    </>
  );

  return (
    <div 
      className={`relative flex h-full bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] theme-${currentTheme.id} overflow-hidden`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isPipActive && pipContainer ? (
          <>
              {createPortal(
                  <div 
                    className={`theme-${currentTheme.id} h-full w-full flex relative bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]`}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                      {fullAppComponent}
                  </div>,
                  pipContainer
              )}
              <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-[var(--theme-bg-secondary)]">
                  <PictureInPicture2 size={48} className="text-[var(--theme-text-link)] mb-4" />
                  <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">Chat in Picture-in-Picture</h2>
                  <p className="text-sm text-[var(--theme-text-secondary)] mt-2 max-w-xs">The chat is running in a separate window. Close it to bring the conversation back here.</p>
                  <button 
                      onClick={togglePip} 
                      className="mt-6 px-4 py-2 bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] rounded-lg font-medium hover:bg-[var(--theme-bg-accent-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]"
                  >
                      Close PiP Window
                  </button>
              </div>
          </>
      ) : (
          fullAppComponent
      )}
    </div>
  );
};

export default App;