


import React, { useState, useEffect, useCallback } from 'react';
import { Paperclip } from 'lucide-react';
import { AppSettings, PreloadedMessage } from './types';
import {
    CANVAS_ASSISTANT_SYSTEM_PROMPT,
    DEFAULT_SYSTEM_INSTRUCTION,
    TAB_CYCLE_MODELS,
    AVAILABLE_THEMES
} from './constants';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { PreloadedMessagesModal } from './components/PreloadedMessagesModal';
import { HistorySidebar } from './components/HistorySidebar';
import { useAppSettings } from './hooks/useAppSettings';
import { useChat } from './hooks/useChat';
import { getTranslator } from './utils/appUtils';

const App: React.FC = () => {
  const { appSettings, setAppSettings, currentTheme, language } = useAppSettings();
  const t = getTranslator(language);

  const {
      messages,
      isLoading,
      currentChatSettings,
      inputText,
      setInputText,
      selectedFiles,
      setSelectedFiles,
      editingMessageId,
      setEditingMessageId,
      appFileError,
      setAppFileError,
      isAppProcessingFile,
      savedSessions,
      activeSessionId,
      isStreamingEnabled,
      apiModels,
      isModelsLoading,
      modelsLoadingError,
      messagesEndRef,
      scrollContainerRef,
      preloadedMessages,
      isAppDraggingOver,
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
      handleToggleStreaming,
      handleDeleteChatHistorySession,
      handleSavePreloadedScenario,
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
      setCurrentChatSettings
  } = useChat(appSettings);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPreloadedMessagesModalOpen, setIsPreloadedMessagesModalOpen] = useState<boolean>(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState<boolean>(false);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    setCurrentChatSettings({
        modelId: newSettings.modelId,
        temperature: newSettings.temperature,
        topP: newSettings.topP,
        showThoughts: newSettings.showThoughts,
        systemInstruction: newSettings.systemInstruction,
    });
    setIsSettingsModalOpen(false);
  };
  
  const handleLoadCanvasHelperPromptAndSave = () => {
    const isCurrentlyCanvasPrompt = currentChatSettings.systemInstruction === CANVAS_ASSISTANT_SYSTEM_PROMPT;
    const newSystemInstruction = isCurrentlyCanvasPrompt ? DEFAULT_SYSTEM_INSTRUCTION : CANVAS_ASSISTANT_SYSTEM_PROMPT;

    const newAppSettings = {
      ...appSettings,
      systemInstruction: newSystemInstruction,
    };
    setAppSettings(newAppSettings);
    setCurrentChatSettings(prev => ({
      ...prev,
      systemInstruction: newSystemInstruction,
    }));
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        const activeElement = document.activeElement as HTMLElement;
        
        const isGenerallyInputFocused = 
            activeElement && (
                activeElement.tagName.toLowerCase() === 'input' ||
                activeElement.tagName.toLowerCase() === 'textarea' ||
                activeElement.tagName.toLowerCase() === 'select' ||
                activeElement.isContentEditable
            );

        if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            startNewChat(true); 
        } 
        else if (event.key === 'Delete') {
            if (isSettingsModalOpen || isPreloadedMessagesModalOpen) {
                return; 
            }
            const chatTextareaAriaLabel = 'Chat message input';
            const isChatTextareaFocused = activeElement?.getAttribute('aria-label') === chatTextareaAriaLabel;
            
            if (isGenerallyInputFocused) { // Check if any input is focused
                if (isChatTextareaFocused && (activeElement as HTMLTextAreaElement).value.trim() === '') {
                    event.preventDefault();
                    handleClearCurrentChat(); 
                }
            } else { // No input focused, clear chat globally
                event.preventDefault();
                handleClearCurrentChat();
            }
        } else if (event.key === 'Tab' && TAB_CYCLE_MODELS.length > 0) {
            const isChatTextareaFocused = activeElement?.getAttribute('aria-label') === 'Chat message input';

            if (isChatTextareaFocused || !isGenerallyInputFocused) { // Cycle if chat textarea focused OR no general input is focused
                event.preventDefault();
                const currentModelId = currentChatSettings.modelId;
                const currentIndex = TAB_CYCLE_MODELS.indexOf(currentModelId);
                let nextIndex: number;

                if (currentIndex === -1) { // Current model not in cycle list, start from first
                    nextIndex = 0;
                } else {
                    nextIndex = (currentIndex + 1) % TAB_CYCLE_MODELS.length;
                }
                const newModelId = TAB_CYCLE_MODELS[nextIndex];
                if (newModelId) {
                    handleSelectModelInHeader(newModelId);
                }
            }
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [startNewChat, handleClearCurrentChat, isSettingsModalOpen, isPreloadedMessagesModalOpen, currentChatSettings.modelId, handleSelectModelInHeader]);

  const getCurrentModelDisplayName = () => {
    const modelIdToDisplay = currentChatSettings.modelId || appSettings.modelId;
    if (isModelsLoading && !modelIdToDisplay && apiModels.length === 0) return "Loading models...";
    if (isModelsLoading && modelIdToDisplay && !apiModels.find(m => m.id === modelIdToDisplay)) return "Verifying model...";
    const model = apiModels.find(m => m.id === modelIdToDisplay);
    if (model) return model.name;
    if (modelIdToDisplay) { let n = modelIdToDisplay.split('/').pop()?.replace('gemini-','Gemini ') || modelIdToDisplay; return n.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').replace(' Preview ',' Preview ');}
    return apiModels.length === 0 && !isModelsLoading ? "No models available" : "No model selected";
  };

  const isCanvasPromptActive = currentChatSettings.systemInstruction === CANVAS_ASSISTANT_SYSTEM_PROMPT;

  return (
    <div className="flex h-screen bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]">
      <HistorySidebar
        isOpen={isHistorySidebarOpen}
        onToggle={() => setIsHistorySidebarOpen(prev => !prev)}
        sessions={savedSessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => loadChatSession(id)}
        onNewChat={() => startNewChat(true)}
        onDeleteSession={handleDeleteChatHistorySession}
        themeColors={currentTheme.colors}
      />
      <div
        className="flex flex-col flex-grow h-full overflow-hidden relative"
        onDragEnter={handleAppDragEnter}
        onDragOver={handleAppDragOver}
        onDragLeave={handleAppDragLeave}
        onDrop={handleAppDrop}
      >
        {isAppDraggingOver && (
          <div className="absolute inset-0 bg-[var(--theme-bg-accent)] bg-opacity-20 flex flex-col items-center justify-center pointer-events-none z-50 border-4 border-dashed border-[var(--theme-bg-accent)] rounded-lg m-1 sm:m-2">
            <Paperclip size={window.innerWidth < 640 ? 48 : 64} className="text-[var(--theme-bg-accent)] opacity-60 mb-2 sm:mb-4" />
            <p className="text-lg sm:text-2xl font-semibold text-[var(--theme-bg-accent)] opacity-85 text-center px-2">Drop files anywhere to upload</p>
          </div>
        )}
        <Header
          onNewChat={() => startNewChat(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenScenariosModal={() => setIsPreloadedMessagesModalOpen(true)}
          onToggleHistorySidebar={() => setIsHistorySidebarOpen(prev => !prev)}
          isLoading={isLoading}
          currentModelName={getCurrentModelDisplayName()}
          availableModels={apiModels}
          selectedModelId={currentChatSettings.modelId || appSettings.modelId}
          onSelectModel={handleSelectModelInHeader}
          isModelsLoading={isModelsLoading}
          isStreamingEnabled={isStreamingEnabled}
          onToggleStreaming={handleToggleStreaming}
          isHistorySidebarOpen={isHistorySidebarOpen}
          onLoadCanvasPrompt={handleLoadCanvasHelperPromptAndSave}
          isCanvasPromptActive={isCanvasPromptActive}
          t={t}
        />
        {modelsLoadingError && (
          <div className="p-2 bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] text-center text-xs flex-shrink-0">{modelsLoadingError}</div>
        )}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentSettings={appSettings}
          availableModels={apiModels}
          availableThemes={AVAILABLE_THEMES}
          onSave={handleSaveSettings}
          isModelsLoading={isModelsLoading}
          modelsLoadingError={modelsLoadingError}
          t={t}
        />
        <PreloadedMessagesModal
          isOpen={isPreloadedMessagesModalOpen}
          onClose={() => setIsPreloadedMessagesModalOpen(false)}
          initialMessages={preloadedMessages}
          onSaveScenario={handleSavePreloadedScenario}
          onLoadScenario={handleLoadPreloadedScenario}
          onImportScenario={handleImportPreloadedScenario}
          onExportScenario={handleExportPreloadedScenario}
        />
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
          baseFontSize={appSettings.baseFontSize}
        />
        <ChatInput
          inputText={inputText}
          setInputText={setInputText}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          onSendMessage={() => handleSendMessage()}
          isLoading={isLoading}
          isEditing={!!editingMessageId}
          onStopGenerating={handleStopGenerating}
          onCancelEdit={handleCancelEdit}
          onProcessFiles={handleProcessAndAddFiles}
          onAddFileById={handleAddFileById}
          onCancelUpload={handleCancelFileUpload}
          isProcessingFile={isAppProcessingFile}
          fileError={appFileError}
          t={t}
        />
      </div>
    </div>
  );
};

export default App;