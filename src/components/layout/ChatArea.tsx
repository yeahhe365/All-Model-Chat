import React, { useMemo } from 'react';
import { Header } from '../header/Header';
import { MessageList } from '../chat/MessageList';
import { ChatInput } from '../chat/input/ChatInput';
import { DragDropOverlay } from '../chat/overlays/DragDropOverlay';
import { ModelsErrorDisplay } from '../chat/overlays/ModelsErrorDisplay';
import { ChatAreaProps } from './chat-area/ChatAreaProps';
import { useChatArea } from './chat-area/useChatArea';
import { getShortcutDisplay } from '../../utils/shortcutUtils';
import { Translator } from '../../utils/appUtils';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';

// Re-export props for consumers like useAppProps
export type { ChatAreaProps };

export const ChatArea: React.FC<ChatAreaProps> = (props) => {
  const {
    activeSessionId, sessionTitle, currentChatSettings,
    isAppDraggingOver, handleAppDragEnter, handleAppDragOver, handleAppDragLeave, handleAppDrop,
    onNewChat, onOpenSettingsModal, onOpenScenariosModal, onToggleHistorySidebar, isLoading,
    currentModelName, availableModels, selectedModelId, onSelectModel,
    isCanvasPromptActive, onLoadCanvasPrompt, onToggleBBox, isBBoxModeActive, onToggleGuide, isGuideModeActive,
    isKeyLocked, modelsLoadingError,
    messages, setScrollContainerRef, onScrollContainerScroll, onEditMessage,
    onDeleteMessage, onRetryMessage, showThoughts,
    onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, onGenerateCanvas, onContinueGeneration, onQuickTTS,
    onEditMessageContent, onUpdateMessageFile,
    onMessageSent, onSendMessage, isEditing,
    onStopGenerating, onCancelEdit, onProcessFiles, onAddFileById, onCancelUpload, onTranscribeAudio,
    isGoogleSearchEnabled, onToggleGoogleSearch, isCodeExecutionEnabled, onToggleCodeExecution,
    isLocalPythonEnabled, onToggleLocalPython,
    isUrlContextEnabled, onToggleUrlContext, isDeepSearchEnabled, onToggleDeepSearch,
    onClearChat, onOpenSettings, onToggleCanvasPrompt,
    onTogglePinCurrentSession, onRetryLastTurn, onEditLastUserMessage,
    isPipSupported, isPipActive, onTogglePip,
    generateQuadImages, onToggleQuadImages,
    onSetThinkingLevel, setCurrentChatSettings, onAddUserMessage,
    onOpenSidePanel,
    onLiveTranscript,
    t
  } = props;

  // Read values from stores directly (no longer passed as props)
  const appSettings = useSettingsStore(s => s.appSettings);
  const themeId = useSettingsStore(s => s.currentTheme.id);
  const language = useSettingsStore(s => s.language);
  const isSwitchingModel = useChatStore(s => s.isSwitchingModel);
  const isHistorySidebarOpen = useUIStore(s => s.isHistorySidebarOpen);
  const scrollContainerRef = useChatStore(s => s.scrollContainerRef) as React.RefObject<HTMLDivElement>;
  const commandedInput = useChatStore(s => s.commandedInput);
  const selectedFiles = useChatStore(s => s.selectedFiles);
  const setSelectedFiles = useChatStore(s => s.setSelectedFiles);
  const editingMessageId = useChatStore(s => s.editingMessageId);
  const setEditingMessageId = useChatStore(s => s.setEditingMessageId);
  const editMode = useChatStore(s => s.editMode);
  const isProcessingFile = useChatStore(s => s.isAppProcessingFile);
  const fileError = useChatStore(s => s.appFileError);
  const setAppFileError = useChatStore(s => s.setAppFileError);
  const aspectRatio = useChatStore(s => s.aspectRatio);
  const setAspectRatio = useChatStore(s => s.setAspectRatio);
  const imageSize = useChatStore(s => s.imageSize);
  const setImageSize = useChatStore(s => s.setImageSize);
  const ttsMessageId = useChatStore(s => s.ttsMessageId);

  const { chatInputHeight, chatInputContainerRef, isImagenModel, handleQuote, handleInsert } = useChatArea({
    currentChatSettings,
  });

  const newChatShortcut = useMemo(() => getShortcutDisplay('general.newChat', appSettings), [appSettings]);
  const pipShortcut = useMemo(() => getShortcutDisplay('general.togglePip', appSettings), [appSettings]);
  const translator = t as Translator;

  return (
    <div
      className="flex flex-col flex-grow h-full overflow-hidden relative chat-bg-enhancement will-change-[width] transform-gpu"
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
        t={translator}
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
        showThoughts={showThoughts}
        themeId={themeId}
        baseFontSize={appSettings.baseFontSize}
        expandCodeBlocksByDefault={appSettings.expandCodeBlocksByDefault}
        isMermaidRenderingEnabled={appSettings.isMermaidRenderingEnabled}
        isGraphvizRenderingEnabled={appSettings.isGraphvizRenderingEnabled ?? true}
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
        chatInputHeight={chatInputHeight}
        appSettings={appSettings}
        currentModelId={currentChatSettings.modelId}
        onOpenSidePanel={onOpenSidePanel}
        onUpdateMessageFile={onUpdateMessageFile}
        onQuote={handleQuote}
        onInsert={handleInsert}
        activeSessionId={activeSessionId}
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
            isImageEditModel={props.isImageEditModel}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            imageSize={imageSize}
            setImageSize={setImageSize}
            t={t}
            isGoogleSearchEnabled={isGoogleSearchEnabled}
            onToggleGoogleSearch={onToggleGoogleSearch}
            isCodeExecutionEnabled={isCodeExecutionEnabled}
            onToggleCodeExecution={onToggleCodeExecution}
            isLocalPythonEnabled={isLocalPythonEnabled}
            onToggleLocalPython={onToggleLocalPython}
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
            onUpdateMessageContent={onEditMessageContent}
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
