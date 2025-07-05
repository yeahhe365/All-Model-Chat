import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { AppSettings, PreloadedMessage, SavedScenario, UploadedFile } from './types';
import { DEFAULT_SYSTEM_INSTRUCTION, TAB_CYCLE_MODELS } from './constants/appConstants';
import { CANVAS_ASSISTANT_SYSTEM_PROMPT } from './constants/promptConstants';
import { AVAILABLE_THEMES } from './constants/themeConstants';
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
      handleDeleteChatHistorySession,
      clearAllHistory,
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
      ttsMessageId,
      setCurrentChatSettings
  } = useChat(appSettings);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPreloadedMessagesModalOpen, setIsPreloadedMessagesModalOpen] = useState<boolean>(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState<boolean>(window.innerWidth >= 768);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    setCurrentChatSettings(prev => ({ // Preserve locked key when changing other settings
        ...prev,
        // Do not change model for current chat from settings. Use header dropdown instead.
        // modelId: newSettings.modelId,
        temperature: newSettings.temperature,
        topP: newSettings.topP,
        showThoughts: newSettings.showThoughts,
        systemInstruction: newSettings.systemInstruction,
        ttsVoice: newSettings.ttsVoice,
        thinkingBudget: newSettings.thinkingBudget,
    }));
    setIsSettingsModalOpen(false);
  };
  
  // Memory management for file previews
  const prevSelectedFilesRef = useRef<UploadedFile[]>([]);
  useEffect(() => {
      const prevFiles = prevSelectedFilesRef.current;
      const currentFiles = selectedFiles;

      // Find files that were in the previous list but not in the current one
      const removedFiles = prevFiles.filter(
          prevFile => !currentFiles.some(currentFile => currentFile.id === prevFile.id)
      );

      // Revoke their object URLs to free up memory
      removedFiles.forEach(file => {
          if (file.dataUrl && file.dataUrl.startsWith('blob:')) {
              URL.revokeObjectURL(file.dataUrl);
          }
      });

      // Update the ref for the next render
      prevSelectedFilesRef.current = currentFiles;
  }, [selectedFiles]);

  // Final cleanup on unmount
  useEffect(() => () => { prevSelectedFilesRef.current.forEach(file => { if (file.dataUrl?.startsWith('blob:')) URL.revokeObjectURL(file.dataUrl) }); }, []);

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
  
  const handleSuggestionClick = (text: string) => {
    setInputText(text);
    // Focus the textarea and move cursor to the end after a tick to ensure state update has rendered
    setTimeout(() => {
        const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
        if (textarea) {
            textarea.focus();
            const textLength = textarea.value.length;
            textarea.setSelectionRange(textLength, textLength);
        }
    }, 0);
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
    if (isModelsLoading && !modelIdToDisplay && apiModels.length === 0) return t('appLoadingModels');
    if (isModelsLoading && modelIdToDisplay && !apiModels.find(m => m.id === modelIdToDisplay)) return t('appVerifyingModel');
    if (isSwitchingModel) return t('appSwitchingModel');
    const model = apiModels.find(m => m.id === modelIdToDisplay);
    if (model) return model.name;
    if (modelIdToDisplay) { let n = modelIdToDisplay.split('/').pop()?.replace('gemini-','Gemini ') || modelIdToDisplay; return n.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').replace(' Preview ',' Preview ');}
    return apiModels.length === 0 && !isModelsLoading ? t('appNoModelsAvailable') : t('appNoModelSelected');
  };

  const isCanvasPromptActive = currentChatSettings.systemInstruction === CANVAS_ASSISTANT_SYSTEM_PROMPT;
  const isImagenModel = currentChatSettings.modelId?.includes('imagen');

  return (
    <div className={`relative flex h-full bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] theme-${currentTheme.id}`}>
      {/* Backdrop for mobile sidebar */}
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
        activeSessionId={activeSessionId}
        onSelectSession={(id) => loadChatSession(id)}
        onNewChat={() => startNewChat(true)}
        onDeleteSession={handleDeleteChatHistorySession}
        themeColors={currentTheme.colors}
        t={t}
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
            <Paperclip size={window.innerWidth < 640 ? 48 : 64} className="text-[var(--theme-bg-accent)] opacity-80 mb-2 sm:mb-4" />
            <p className="text-lg sm:text-2xl font-semibold text-[var(--theme-text-link)] text-center px-2">
              {t('appDragDropRelease')}
            </p>
             <p className="text-sm text-[var(--theme-text-primary)] opacity-80 mt-2">{t('appDragDropHelpText')}</p>
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
          isSwitchingModel={isSwitchingModel}
          isHistorySidebarOpen={isHistorySidebarOpen}
          onLoadCanvasPrompt={handleLoadCanvasHelperPromptAndSave}
          isCanvasPromptActive={isCanvasPromptActive}
          t={t}
          isKeyLocked={!!currentChatSettings.lockedApiKey}
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
          onClearAllHistory={clearAllHistory}
          onClearCache={clearCacheAndReload}
          t={t}
        />
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
          onSuggestionClick={handleSuggestionClick}
          onTextToSpeech={handleTextToSpeech}
          ttsMessageId={ttsMessageId}
          t={t}
          language={language}
        />
        <ChatInput
          appSettings={appSettings}
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
          isImagenModel={isImagenModel}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          t={t}
          transcriptionModelId={appSettings.transcriptionModelId}
          isTranscriptionThinkingEnabled={appSettings.isTranscriptionThinkingEnabled}
        />
      </div>
    </div>
  );
};

export default App;
