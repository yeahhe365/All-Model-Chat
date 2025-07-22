import React, { useEffect, useCallback, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { AppSettings } from './types';
import { CANVAS_ASSISTANT_SYSTEM_PROMPT, DEFAULT_SYSTEM_INSTRUCTION } from './constants/appConstants';
import { AVAILABLE_THEMES } from './constants/themeConstants';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { HistorySidebar } from './components/HistorySidebar';
import { useAppSettings } from './hooks/useAppSettings';
import { useChat } from './hooks/useChat';
import { useAppUI } from './hooks/useAppUI';
import { useAppEvents } from './hooks/useAppEvents';
import { getTranslator, getResponsiveValue } from './utils/appUtils';
import { logService } from './services/logService';
import { SettingsModal } from './components/SettingsModal';
import { LogViewer } from './components/LogViewer';
import { PreloadedMessagesModal } from './components/PreloadedMessagesModal';
import { ExportChatModal } from './components/ExportChatModal';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';


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
      handleScroll,
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
    if (isModelsLoading && !modelIdToDisplay && apiModels.length === 0) return t('appLoadingModels');
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

    const triggerDownload = (href: string, filename: string) => {
        const link = document.createElement('a');
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (href.startsWith('blob:')) {
            URL.revokeObjectURL(href);
        }
    };
    
    const safeTitle = activeChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'chat';
    const date = new Date().toISOString().slice(0, 10);
    const filename = `chat-${safeTitle}-${date}.${format}`;

    try {
        if (format === 'png') {
            if (!scrollContainerRef.current) return;
            document.body.classList.add('is-exporting-png');
            await new Promise(resolve => setTimeout(resolve, 100)); // Allow styles to apply
            const element = scrollContainerRef.current;
            const canvas = await html2canvas(element, {
                height: element.scrollHeight,
                width: element.scrollWidth,
                useCORS: true,
                backgroundColor: currentTheme.colors.bgSecondary,
                scale: 2,
            });
            triggerDownload(canvas.toDataURL('image/png'), filename);
        } else if (format === 'html') {
            if (!scrollContainerRef.current) return;
            const headContent = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"], script[src*="highlight.js"], script[src*="katex"]'))
                .map(el => el.outerHTML).join('\n');
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
            const blob = new Blob([fullHtml], { type: 'text/html' });
            triggerDownload(URL.createObjectURL(blob), filename);
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

            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            triggerDownload(URL.createObjectURL(blob), filename);
        }
    } catch (error) {
        logService.error(`Chat export failed (format: ${format})`, { error });
        alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        document.body.classList.remove('is-exporting-png');
        setExportStatus('idle');
        setIsExportModalOpen(false);
    }
}, [activeChat, currentTheme, language]);

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
      <div
        className="flex flex-col flex-grow h-full overflow-hidden relative chat-bg-enhancement"
        onDragEnter={handleAppDragEnter}
        onDragOver={handleAppDragOver}
        onDragLeave={handleAppDragLeave}
        onDrop={handleAppDrop}
      >
        {isAppDraggingOver && (
          <div className="absolute inset-0 bg-[var(--theme-bg-accent)] bg-opacity-25 flex flex-col items-center justify-center pointer-events-none z-50 border-4 border-dashed border-[var(--theme-bg-accent)] rounded-lg m-1 sm:m-2 drag-overlay-animate">
            <Paperclip size={getResponsiveValue(48, 64)} className="text-[var(--theme-bg-accent)] opacity-80 mb-2 sm:mb-4" />
            <p className="text-lg sm:text-2xl font-semibold text-[var(--theme-text-link)] text-center px-2">
              {t('appDragDropRelease')}
            </p>
             <p className="text-sm text-[var(--theme-text-primary)] opacity-80 mt-2">{t('appDragDropHelpText')}</p>
          </div>
        )}
        <Header
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
          t={t}
          isKeyLocked={!!currentChatSettings.lockedApiKey}
          defaultModelId={appSettings.modelId}
          onSetDefaultModel={handleSetDefaultModel}
        />
        {modelsLoadingError && (
          <div className="p-2 bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] text-center text-xs flex-shrink-0">{modelsLoadingError}</div>
        )}
        <>
          {isLogViewerOpen && (
            <LogViewer
                isOpen={isLogViewerOpen}
                onClose={() => setIsLogViewerOpen(false)}
                appSettings={appSettings}
                currentChatSettings={currentChatSettings}
            />
          )}
          {isSettingsModalOpen && (
            <SettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
              currentSettings={appSettings}
              availableModels={apiModels}
              availableThemes={AVAILABLE_THEMES}
              onSave={handleSaveSettings}
              isModelsLoading={isModelsLoading}
              modelsLoadingError={modelsLoadingError}
              onClearAllHistory={clearCacheAndReload}
              onClearCache={clearCacheAndReload}
              onOpenLogViewer={() => setIsLogViewerOpen(true)}
              onInstallPwa={handleInstallPwa}
              isInstallable={!!installPromptEvent && !isStandalone}
              onImportSettings={handleImportSettings}
              onExportSettings={handleExportSettings}
              t={t}
            />
          )}
          {isPreloadedMessagesModalOpen && (
            <PreloadedMessagesModal
              isOpen={isPreloadedMessagesModalOpen}
              onClose={() => setIsPreloadedMessagesModalOpen(false)}
              savedScenarios={savedScenarios}
              onSaveAllScenarios={handleSaveAllScenarios}
              onLoadScenario={handleLoadPreloadedScenario}
              onImportScenario={handleImportPreloadedScenario}
              onExportScenario={handleExportPreloadedScenario}
              t={t}
            />
          )}
          {isExportModalOpen && (
              <ExportChatModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExportChat}
                exportStatus={exportStatus}
                t={t}
              />
          )}
        </>
        <MessageList
          messages={messages}
          messagesEndRef={messagesEndRef}
          scrollContainerRef={scrollContainerRef}
          onScrollContainerScroll={handleScroll}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onRetryMessage={handleRetryMessage}
          showThoughts={currentChatSettings.showThoughts}
          themeColors={currentTheme.colors}
          themeId={currentTheme.id}
          baseFontSize={appSettings.baseFontSize}
          expandCodeBlocksByDefault={appSettings.expandCodeBlocksByDefault}
          isMermaidRenderingEnabled={appSettings.isMermaidRenderingEnabled}
          onSuggestionClick={handleSuggestionClick}
          onTextToSpeech={handleTextToSpeech}
          ttsMessageId={ttsMessageId}
          t={t}
          language={language}
          scrollNavVisibility={scrollNavVisibility}
          onScrollToPrevTurn={scrollToPrevTurn}
          onScrollToNextTurn={scrollToNextTurn}
        />
        <ChatInput
          appSettings={appSettings}
          commandedInput={commandedInput}
          onMessageSent={() => setCommandedInput(null)}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          onSendMessage={(text) => handleSendMessage({ text })}
          isLoading={isLoading}
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
          t={t}
          isGoogleSearchEnabled={!!currentChatSettings.isGoogleSearchEnabled}
          onToggleGoogleSearch={toggleGoogleSearch}
          isCodeExecutionEnabled={!!currentChatSettings.isCodeExecutionEnabled}
          onToggleCodeExecution={toggleCodeExecution}
          isUrlContextEnabled={!!currentChatSettings.isUrlContextEnabled}
          onToggleUrlContext={toggleUrlContext}
          onClearChat={handleClearCurrentChat}
          onNewChat={startNewChat}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onToggleCanvasPrompt={handleLoadCanvasHelperPromptAndSave}
          onSelectModel={handleSelectModelInHeader}
          availableModels={apiModels}
        />
      </div>
    </div>
  );
};

export default App;