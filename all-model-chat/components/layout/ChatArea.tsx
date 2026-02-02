


import React, { useMemo } from 'react';
import { Header } from '../header/Header';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/input/ChatInput';
import { DragDropOverlay } from '../chat/overlays/DragDropOverlay';
import { ModelsErrorDisplay } from '../chat/overlays/ModelsErrorDisplay';
import { ChatAreaProps } from './chat-area/ChatAreaProps';
import { useChatArea } from './chat-area/useChatArea';
import { getShortcutDisplay } from '../../utils/shortcutUtils';

// Re-export props for consumers like useAppProps
export type { ChatAreaProps };

export const ChatArea: React.FC<ChatAreaProps> = (props) => {
  const {
    activeSessionId, sessionTitle, currentChatSettings, setAppFileError,
    isAppDraggingOver, handleAppDragEnter, handleAppDragOver, handleAppDragLeave, handleAppDrop,
    onNewChat, onOpenSettingsModal, onOpenScenariosModal, onToggleHistorySidebar, isLoading,
    currentModelName, availableModels, selectedModelId, onSelectModel,
    isSwitchingModel, isHistorySidebarOpen, onLoadCanvasPrompt, isCanvasPromptActive,
    onToggleBBox, isBBoxModeActive,
    onToggleGuide, isGuideModeActive,
    isKeyLocked, themeId, modelsLoadingError,
    messages, scrollContainerRef, setScrollContainerRef, onScrollContainerScroll, onEditMessage,
    onDeleteMessage, onRetryMessage, showThoughts, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled,
    onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, onGenerateCanvas, onContinueGeneration, ttsMessageId, onQuickTTS, language, scrollNavVisibility,
    onScrollToPrevTurn, onScrollToNextTurn, onEditMessageContent, onUpdateMessageFile,
    appSettings, commandedInput, setCommandedInput, onMessageSent,
    selectedFiles, setSelectedFiles, onSendMessage, isEditing, editMode, editingMessageId, setEditingMessageId, onStopGenerating,
    onCancelEdit, onProcessFiles, onAddFileById, onCancelUpload, onTranscribeAudio,
    isProcessingFile, fileError, isImageEditModel, aspectRatio, setAspectRatio, imageSize, setImageSize,
    isGoogleSearchEnabled, onToggleGoogleSearch, isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext, isDeepSearchEnabled, onToggleDeepSearch,
    onClearChat, onOpenSettings, onToggleCanvasPrompt,
    onTogglePinCurrentSession, onRetryLastTurn, onEditLastUserMessage,
    isPipSupported, isPipActive, onTogglePip,
    generateQuadImages, onToggleQuadImages,
    onSetThinkingLevel, setCurrentChatSettings, onUpdateMessageContent, onAddUserMessage,
    onOpenSidePanel,
    onLiveTranscript,
    t
  } = props;

  const { chatInputHeight, chatInputContainerRef, isImagenModel, handleQuote, handleInsert } = useChatArea(props);
  
  const newChatShortcut = useMemo(() => getShortcutDisplay('general.newChat', appSettings), [appSettings]);
  const pipShortcut = useMemo(() => getShortcutDisplay('general.togglePip', appSettings), [appSettings]);

  return (
    <div
      className="flex flex-col flex-grow h-full overflow-hidden relative chat-bg-enhancement"
      onDragEnter={handleAppDragEnter}
      onDragOver={handleAppDragOver}
      onDragLeave={handleAppDragLeave}
      onDrop={handleAppDrop}
    >
      <DragDropOverlay isDraggingOver={isAppDraggingOver} t={t} />
      
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
        isSwitchingModel={isSwitchingModel}
        isHistorySidebarOpen={isHistorySidebarOpen}
        onLoadCanvasPrompt={onLoadCanvasPrompt}
        isCanvasPromptActive={isCanvasPromptActive}
        t={t}
        isKeyLocked={isKeyLocked}
        isPipSupported={isPipSupported}
        isPipActive={isPipActive}
        onTogglePip={onTogglePip}
        themeId={themeId}
        thinkingLevel={currentChatSettings.thinkingLevel}
        onSetThinkingLevel={onSetThinkingLevel}
        newChatShortcut={newChatShortcut}
        pipShortcut={pipShortcut}
      />

      <ModelsErrorDisplay error={modelsLoadingError} />

      <MessageList
        messages={messages}
        sessionTitle={sessionTitle}
        scrollContainerRef={scrollContainerRef}
        setScrollContainerRef={setScrollContainerRef}
        onScrollContainerScroll={onScrollContainerScroll}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onRetryMessage={onRetryMessage}
        onEditMessageContent={onEditMessageContent}
        showThoughts={showThoughts}
        themeId={themeId}
        baseFontSize={baseFontSize}
        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
        onSuggestionClick={onSuggestionClick}
        onOrganizeInfoClick={onOrganizeInfoClick}
        onFollowUpSuggestionClick={onFollowUpSuggestionClick}
        onTextToSpeech={onTextToSpeech}
        onGenerateCanvas={onGenerateCanvas}
        onContinueGeneration={onContinueGeneration}
        ttsMessageId={ttsMessageId}
        onQuickTTS={onQuickTTS}
        t={t}
        language={language}
        scrollNavVisibility={scrollNavVisibility}
        onScrollToPrevTurn={onScrollToPrevTurn}
        onScrollToNextTurn={onScrollToNextTurn}
        chatInputHeight={chatInputHeight}
        appSettings={appSettings}
        currentModelId={currentChatSettings.modelId} 
        onOpenSidePanel={onOpenSidePanel}
        onUpdateMessageFile={onUpdateMessageFile}
        onQuote={handleQuote}
        onInsert={handleInsert}
      />

      <div ref={chatInputContainerRef} className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
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
            editMode={editMode}
            editingMessageId={editingMessageId}
            setEditingMessageId={setEditingMessageId}
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
            imageSize={imageSize}
            setImageSize={setImageSize}
            t={t}
            isGoogleSearchEnabled={isGoogleSearchEnabled}
            onToggleGoogleSearch={onToggleGoogleSearch}
            isCodeExecutionEnabled={isCodeExecutionEnabled}
            onToggleCodeExecution={onToggleCodeExecution}
            isUrlContextEnabled={isUrlContextEnabled}
            onToggleUrlContext={onToggleUrlContext}
            isDeepSearchEnabled={isDeepSearchEnabled}
            onToggleDeepSearch={onToggleDeepSearch}
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
            generateQuadImages={generateQuadImages}
            onToggleQuadImages={onToggleQuadImages}
            setCurrentChatSettings={setCurrentChatSettings}
            onSuggestionClick={onSuggestionClick}
            onOrganizeInfoClick={onOrganizeInfoClick}
            showEmptyStateSuggestions={messages.length === 0}
            onUpdateMessageContent={onUpdateMessageContent}
            onAddUserMessage={onAddUserMessage}
            onLiveTranscript={onLiveTranscript}
            onToggleBBox={onToggleBBox}
            isBBoxModeActive={isBBoxModeActive}
            onToggleGuide={onToggleGuide}
            isGuideModeActive={isGuideModeActive}
            themeId={themeId}
          />
        </div>
      </div>
    </div>
  );
};