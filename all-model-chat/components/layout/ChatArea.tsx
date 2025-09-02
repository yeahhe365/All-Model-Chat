import React, { useState, useRef, useEffect } from 'react';
import { Paperclip } from 'lucide-react';
import { Header } from '../Header';
import { MessageList } from '../MessageList';
import { ChatInput } from '../ChatInput';
import { ChatAreaProps } from '../../types';
import { getResponsiveValue } from '../../utils/appUtils';
import { ContextMenu, ContextMenuItem } from '../shared/ContextMenu';

export const ChatArea: React.FC<ChatAreaProps> = (props) => {
  const {
    activeSessionId,
    isAppDraggingOver, handleAppDragEnter, handleAppDragOver, handleAppDragLeave, handleAppDrop,
    onNewChat, onOpenSettingsModal, onOpenScenariosModal, onToggleHistorySidebar, isLoading,
    currentModelName, availableModels, selectedModelId, onSelectModel, isModelsLoading,
    isSwitchingModel, isHistorySidebarOpen, onLoadCanvasPrompt, isCanvasPromptActive,
    isKeyLocked, defaultModelId, onSetDefaultModel, themeId, modelsLoadingError,
    messages, messagesEndRef, scrollContainerRef, onScrollContainerScroll, onEditMessage,
    onDeleteMessage, onRetryMessage, onVersionChange, showThoughts, themeColors, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled,
    onSuggestionClick, onFollowUpSuggestionClick, onTextToSpeech, ttsMessageId, language, scrollNavVisibility,
    onScrollToPrevTurn, onScrollToNextTurn, appSettings, commandedInput, setCommandedInput, onMessageSent,
    selectedFiles, setSelectedFiles, onSendMessage, isEditing, onStopGenerating,
    onCancelEdit, onProcessFiles, onAddFileById, onCancelUpload, onTranscribeAudio,
    isProcessingFile, fileError, isImagenModel, isImageEditModel, aspectRatio, setAspectRatio,
    isGoogleSearchEnabled, onToggleGoogleSearch, isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext, onClearChat, onOpenSettings, onToggleCanvasPrompt,
    onTogglePinCurrentSession, onRetryLastTurn, onEditLastUserMessage,
    onOpenLogViewer, onClearAllHistory,
    onModalVisibilityChange,
    isPipSupported, isPipActive, onTogglePip,
    t
  } = props;

  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; items: ContextMenuItem[] } | null>(null);
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

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('textarea[aria-label="Chat message input"]')) {
        // Let the ChatInput's context menu handle this
        return;
    }
    e.preventDefault();

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    let items: ContextMenuItem[];

    if (selectedText) {
        items = [
            {
                label: t('copy', 'Copy'),
                icon: 'ClipboardCopy',
                onClick: () => {
                    navigator.clipboard.writeText(selectedText);
                },
            },
            {
                label: t('fill_input', 'Fill Input'),
                icon: 'Edit3',
                onClick: () => {
                    setCommandedInput({ text: selectedText, id: Date.now() });
                },
            },
        ];
    } else {
        items = [
            {
                label: t('canvasHelperToggle', 'Toggle Canvas Helper'),
                icon: 'Wand2',
                onClick: onToggleCanvasPrompt,
            },
            {
                label: t('settingsOpen_title', 'Chat Settings'),
                icon: 'Settings',
                onClick: onOpenSettingsModal,
            },
            {
                label: t('settingsViewLogs', 'View Logs'),
                icon: 'Terminal',
                onClick: onOpenLogViewer,
            },
            {
                label: t('settingsClearHistory', 'Clear History'),
                icon: 'Trash2',
                onClick: () => {
                    if (window.confirm(t('settingsClearHistory_confirm'))) {
                        onClearAllHistory();
                    }
                },
                isDanger: true,
            },
        ];

        if (isPipSupported) {
            items.splice(2, 0, { // Insert after "Chat Settings"
                label: isPipActive ? t('pipExit', 'Exit Picture-in-Picture') : t('pipEnter', 'Enter Picture-in-Picture'),
                icon: isPipActive ? 'PictureInPicture2' : 'PictureInPicture',
                onClick: onTogglePip,
            });
        }
    }

    setContextMenu({
        isOpen: true,
        x: e.pageX,
        y: e.pageY,
        items: items,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div
      className="flex flex-col flex-grow h-full overflow-hidden relative chat-bg-enhancement"
      onDragEnter={handleAppDragEnter}
      onDragOver={handleAppDragOver}
      onDragLeave={handleAppDragLeave}
      onDrop={handleAppDrop}
      onContextMenu={handleContextMenu}
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
        messagesEndRef={messagesEndRef}
        scrollContainerRef={scrollContainerRef}
        onScrollContainerScroll={onScrollContainerScroll}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onRetryMessage={onRetryMessage}
        onVersionChange={onVersionChange}
        showThoughts={showThoughts}
        themeColors={themeColors}
        themeId={themeId}
        baseFontSize={baseFontSize}
        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
        onSuggestionClick={onSuggestionClick}
        onFollowUpSuggestionClick={onFollowUpSuggestionClick}
        onTextToSpeech={onTextToSpeech}
        ttsMessageId={ttsMessageId}
        t={t}
        language={language}
        scrollNavVisibility={scrollNavVisibility}
        onScrollToPrevTurn={onScrollToPrevTurn}
        onScrollToNextTurn={onScrollToNextTurn}
        chatInputHeight={chatInputHeight}
      />
      <div ref={chatInputContainerRef} className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <ChatInput
            appSettings={appSettings}
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
            onModalVisibilityChange={onModalVisibilityChange}
            onTogglePip={onTogglePip}
            isPipActive={isPipActive}
          />
        </div>
      </div>
      {contextMenu && (
        <ContextMenu 
            isOpen={contextMenu.isOpen}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={handleCloseContextMenu}
            items={contextMenu.items}
        />
      )}
    </div>
  );
};
