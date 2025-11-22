import React, { useState, useRef, useEffect } from 'react';
import { Paperclip } from 'lucide-react';
import { Header } from '../Header';
import { MessageList } from '../MessageList';
import { ChatInput } from '../ChatInput';
import { ChatAreaProps } from '../../types';
import { getResponsiveValue } from '../../utils/appUtils';

export const ChatArea: React.FC<ChatAreaProps> = (props) => {
  const {
    activeSessionId, currentChatSettings, setAppFileError,
    isAppDraggingOver, handleAppDragEnter, handleAppDragOver, handleAppDragLeave, handleAppDrop,
    onNewChat, onOpenSettingsModal, onOpenScenariosModal, onToggleHistorySidebar, isLoading,
    currentModelName, availableModels, selectedModelId, onSelectModel, isModelsLoading,
    isSwitchingModel, isHistorySidebarOpen, onLoadCanvasPrompt, isCanvasPromptActive,
    isKeyLocked, defaultModelId, onSetDefaultModel, themeId, modelsLoadingError,
    messages, scrollContainerRef, onScrollContainerScroll, onEditMessage,
    onDeleteMessage, onRetryMessage, showThoughts, themeColors, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled,
    onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, ttsMessageId, language, scrollNavVisibility,
    onScrollToPrevTurn, onScrollToNextTurn, appSettings, commandedInput, setCommandedInput, onMessageSent,
    selectedFiles, setSelectedFiles, onSendMessage, isEditing, onStopGenerating,
    onCancelEdit, onProcessFiles, onAddFileById, onCancelUpload, onTranscribeAudio,
    isProcessingFile, fileError, isImageEditModel, aspectRatio, setAspectRatio,
    isGoogleSearchEnabled, onToggleGoogleSearch, isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext, onClearChat, onOpenSettings, onToggleCanvasPrompt,
    onTogglePinCurrentSession, onRetryLastTurn, onEditLastUserMessage,
    onOpenLogViewer, onClearAllHistory,
    isPipSupported, isPipActive, onTogglePip,
    t
  } = props;

  const [chatInputHeight, setChatInputHeight] = useState(160); // A reasonable default.
  const chatInputContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const chatInputEl = chatInputContainerRef.current;
    if (!chatInputEl) return;

    const resizeObserver = new ResizeObserver(() => {
        setChatInputHeight(chatInputEl.offsetHeight); 
    });

    resizeObserver.observe(chatInputEl);

    // Initial measurement
    setChatInputHeight(chatInputEl.offsetHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Determine if the model supports aspect ratio selection (Imagen models OR Gemini 2.5 Flash Image)
  const isImagenModel = currentChatSettings.modelId?.includes('imagen') || currentChatSettings.modelId?.includes('gemini-2.5-flash-image');

  return (
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
        onNewChat={onNewChat}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenScenariosModal={onOpenScenariosModal}
        onToggleHistorySidebar={onToggleHistorySidebar}
        isLoading={isLoading}
        currentModelName={currentModelName}
        availableModels={availableModels}
        selectedModelId={selectedModelId}
        onSelectModel={onSelectModel}
        isModelsLoading={isModelsLoading}
        isSwitchingModel={isSwitchingModel}
        isHistorySidebarOpen={isHistorySidebarOpen}
        onLoadCanvasPrompt={onLoadCanvasPrompt}
        isCanvasPromptActive={isCanvasPromptActive}
        t={t}
        isKeyLocked={isKeyLocked}
        defaultModelId={defaultModelId}
        onSetDefaultModel={onSetDefaultModel}
        isPipSupported={isPipSupported}
        isPipActive={isPipActive}
        onTogglePip={onTogglePip}
        themeId={themeId}
      />
      {modelsLoadingError && (
        <div className="mx-2 my-1 p-2 text-sm text-center text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md flex-shrink-0">{modelsLoadingError}</div>
      )}
      <MessageList
        messages={messages}
        scrollContainerRef={scrollContainerRef}
        onScrollContainerScroll={onScrollContainerScroll}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onRetryMessage={onRetryMessage}
        showThoughts={showThoughts}
        themeColors={themeColors}
        themeId={themeId}
        baseFontSize={baseFontSize}
        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
        onSuggestionClick={onSuggestionClick}
        onOrganizeInfoClick={onOrganizeInfoClick}
        onFollowUpSuggestionClick={onFollowUpSuggestionClick}
        onTextToSpeech={onTextToSpeech}
        ttsMessageId={ttsMessageId}
        t={t}
        language={language}
        scrollNavVisibility={scrollNavVisibility}
        onScrollToPrevTurn={onScrollToPrevTurn}
        onScrollToNextTurn={onScrollToNextTurn}
        chatInputHeight={chatInputHeight}
        appSettings={appSettings}
      />
      <div ref={chatInputContainerRef} className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <ChatInput
            appSettings={appSettings}
            currentChatSettings={currentChatSettings}
            setAppFileError={setAppFileError}
            activeSessionId={activeSessionId}
            commandedInput={commandedInput}
            onMessageSent={onMessageSent}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            isEditing={isEditing}
            onStopGenerating={onStopGenerating}
            onCancelEdit={onCancelEdit}
            onProcessFiles={onProcessFiles}
            onAddFileById={onAddFileById}
            onCancelUpload={onCancelUpload}
            onTranscribeAudio={onTranscribeAudio}
            isProcessingFile={isProcessingFile}
            fileError={fileError}
            isImagenModel={isImagenModel}
            isImageEditModel={isImageEditModel}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            t={t}
            isGoogleSearchEnabled={isGoogleSearchEnabled}
            onToggleGoogleSearch={onToggleGoogleSearch}
            isCodeExecutionEnabled={isCodeExecutionEnabled}
            onToggleCodeExecution={onToggleCodeExecution}
            isUrlContextEnabled={isUrlContextEnabled}
            onToggleUrlContext={onToggleUrlContext}
            onClearChat={onClearChat}
            onNewChat={onNewChat}
            onOpenSettings={onOpenSettings}
            onToggleCanvasPrompt={onToggleCanvasPrompt}
            onSelectModel={onSelectModel}
            availableModels={availableModels}
            onTogglePinCurrentSession={onTogglePinCurrentSession}
            onRetryLastTurn={onRetryLastTurn}
            onEditLastUserMessage={onEditLastUserMessage}
            onTogglePip={onTogglePip}
            isPipActive={isPipActive}
            isHistorySidebarOpen={isHistorySidebarOpen}
          />
        </div>
      </div>
    </div>
  );
};