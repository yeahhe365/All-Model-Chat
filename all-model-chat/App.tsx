import React, { useEffect, useCallback, useState } from 'react';
import { AppSettings } from './types';
import { CANVAS_ASSISTANT_SYSTEM_PROMPT, DEFAULT_SYSTEM_INSTRUCTION } from './constants/appConstants';
import { HistorySidebar } from './components/HistorySidebar';
import { useAppSettings } from './hooks/useAppSettings';
import { useChat } from './hooks/useChat';
import { useAppUI } from './hooks/useAppUI';
import { useAppEvents } from './hooks/useAppEvents';
import { getTranslator, logService } from './utils/appUtils';
import mermaid from 'mermaid';
import { ChatArea } from './components/layout/ChatArea';
import { AppModals } from './components/modals/AppModals';
import { sanitizeFilename, exportElementAsPng, exportHtmlStringAsFile, exportTextStringAsFile, gatherPageStyles } from './utils/exportUtils';
import DOMPurify from 'dompurify';


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
      isAppProcessingFile,
      savedSessions,
      savedGroups,
      activeSessionId,
      apiModels,
      isModelsLoading,
      modelsLoadingError,
      isSwitchingModel,
      messagesEndRef,
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
      handleSaveAllScenarios,
      handleLoadPreloadedScenario,
      handleImportPreloadedScenario,
      handleExportPreloadedScenario,
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
  
  const {
    installPromptEvent,
    isStandalone,
    handleInstallPwa,
    handleExportSettings,
    handleImportSettings,
  } = useAppEvents({
    appSettings,
    setAppSettings,
    savedSessions,
    language,
    startNewChat,
    handleClearCurrentChat,
    currentChatSettings,
    handleSelectModelInHeader,
    isSettingsModalOpen,
    isPreloadedMessagesModalOpen,
    setIsLogViewerOpen,
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting'>('idle');


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
  
  const handleSuggestionClick = (text: string) => {
    setCommandedInput({ text: text + '\n', id: Date.now() });
    setTimeout(() => {
        const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
    }, 0);
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

  const activeChat = savedSessions.find(s => s.id === activeSessionId);

  const handleExportChat = useCallback(async (format: 'png' | 'html' | 'txt') => {
    if (!activeChat) return;
    setExportStatus('exporting');
    
    const safeTitle = sanitizeFilename(activeChat.title);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `chat-${safeTitle}-${date}.${format}`;

    try {
        if (format === 'png') {
            if (!scrollContainerRef.current) return;
            document.body.classList.add('is-exporting-png');
            await new Promise(resolve => setTimeout(resolve, 100)); // Allow styles to apply
            
            await exportElementAsPng(scrollContainerRef.current, filename, {
                backgroundColor: currentTheme.colors.bgSecondary,
            });

        } else if (format === 'html') {
            if (!scrollContainerRef.current) return;

            const headContent = await gatherPageStyles();
            const bodyClasses = document.body.className;
            const rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary');
            const chatHtml = scrollContainerRef.current.innerHTML;

            const fullHtml = `
                <!DOCTYPE html>
                <html lang="${language}">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Chat Export: ${DOMPurify.sanitize(activeChat.title)}</title>
                    ${headContent}
                    <script>
                        document.addEventListener('DOMContentLoaded', () => {
                            if (window.hljs) {
                                document.querySelectorAll('pre code').forEach((el) => {
                                    window.hljs.highlightElement(el);
                                });
                            }
                        });
                    </script>
                    <style>
                        body { background-color: ${rootBgColor}; padding: 1rem; box-sizing: border-box; }
                        .message-actions { opacity: 0.5 !important; transform: none !important; }
                        .group:hover .message-actions { opacity: 1 !important; }
                        .sticky[aria-label="Scroll to bottom"] { display: none !important; }
                    </style>
                </head>
                <body class="${bodyClasses}">
                    <div class="exported-chat-container w-full max-w-7xl mx-auto">
                        ${chatHtml}
                    </div>
                </body>
                </html>
            `;
            exportHtmlStringAsFile(fullHtml, filename);
        } else { // TXT
            const textContent = activeChat.messages.map(message => {
                const role = message.role === 'user' ? 'USER' : 'ASSISTANT';
                let content = `### ${role}\n`;
                if (message.files && message.files.length > 0) {
                    message.files.forEach(file => {
                        content += `[File attached: ${file.name}]\n`;
                    });
                }
                content += message.content;
                return content;
            }).join('\n\n');

            exportTextStringAsFile(textContent, filename);
        }
    } catch (error) {
        logService.error(`Chat export failed (format: ${format})`, { error });
        alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        document.body.classList.remove('is-exporting-png');
        setExportStatus('idle');
        setIsExportModalOpen(false);
    }
}, [activeChat, currentTheme, language, scrollContainerRef]);

  const isCanvasPromptActive = currentChatSettings.systemInstruction === CANVAS_ASSISTANT_SYSTEM_PROMPT;
  const isImagenModel = currentChatSettings.modelId?.includes('imagen');

  return (
    <div 
      className={`relative flex h-full bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] theme-${currentTheme.id}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isHistorySidebarOpen && (
        <div 
          onClick={() => setIsHistorySidebarOpen(false)} 
          className="fixed sm:hidden inset-0 bg-black/60 z-20 transition-opacity duration-300"
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
        messagesEndRef={messagesEndRef}
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
        onSuggestionClick={handleSuggestionClick}
        onTextToSpeech={handleTextToSpeech}
        ttsMessageId={ttsMessageId}
        language={language}
        scrollNavVisibility={scrollNavVisibility}
        onScrollToPrevTurn={scrollToPrevTurn}
        onScrollToNextTurn={scrollToNextTurn}
        appSettings={appSettings}
        commandedInput={commandedInput}
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
        t={t}
      />
      <AppModals
        isSettingsModalOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        appSettings={appSettings}
        availableModels={apiModels}
        handleSaveSettings={handleSaveSettings}
        isModelsLoading={isModelsLoading}
        modelsLoadingError={modelsLoadingError}
        clearCacheAndReload={clearCacheAndReload}
        handleInstallPwa={handleInstallPwa}
        installPromptEvent={installPromptEvent}
        isStandalone={isStandalone}
        handleImportSettings={handleImportSettings}
        handleExportSettings={handleExportSettings}
        isPreloadedMessagesModalOpen={isPreloadedMessagesModalOpen}
        setIsPreloadedMessagesModalOpen={setIsPreloadedMessagesModalOpen}
        savedScenarios={savedScenarios}
        handleSaveAllScenarios={handleSaveAllScenarios}
        handleLoadPreloadedScenario={handleLoadPreloadedScenario}
        handleImportPreloadedScenario={handleImportPreloadedScenario}
        handleExportPreloadedScenario={handleExportPreloadedScenario}
        isExportModalOpen={isExportModalOpen}
        setIsExportModalOpen={setIsExportModalOpen}
        handleExportChat={handleExportChat}
        exportStatus={exportStatus}
        isLogViewerOpen={isLogViewerOpen}
        setIsLogViewerOpen={setIsLogViewerOpen}
        currentChatSettings={currentChatSettings}
        t={t}
      />
    </div>
  );
};

export default App;