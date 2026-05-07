/* eslint-disable react-hooks/refs */
import React from 'react';
import { ChatInputToolbar } from './ChatInputToolbar';
import { ChatInputActions } from './ChatInputActions';
import { SlashCommandMenu } from './SlashCommandMenu';
import { ChatSuggestions } from './area/ChatSuggestions';
import { ChatQuoteDisplay } from './area/ChatQuoteDisplay';
import { ChatFilePreviewList } from './area/ChatFilePreviewList';
import { ChatTextArea } from './area/ChatTextArea';
import { LiveStatusBanner } from './LiveStatusBanner';
import { QueuedSubmissionCard } from './QueuedSubmissionCard';
import { HiddenFileInputs } from './HiddenFileInputs';
import { useChatInputAreaLayout } from './useChatInputAreaLayout';
import { useI18n } from '../../../contexts/I18nContext';
import { useChatInputContext } from './ChatInputContext';

export const ChatInputArea: React.FC = () => {
  const { t } = useI18n();
  const {
    chatInput,
    inputState,
    capabilities,
    liveAPI,
    modalsState,
    localFileState,
    voiceState,
    slashCommandState,
    handlers,
    inputDisabled,
    initialTextareaHeight,
    queuedSubmissionView,
  } = useChatInputContext();

  const isFullscreen = inputState.isFullscreen;
  const isPipActive = chatInput.isPipActive;
  const isAnimatingSend = inputState.isAnimatingSend;
  const isMobile = inputState.isMobile;
  const isConverting = localFileState.isConverting;
  const isRecording = voiceState.isRecording;

  const {
    isUIBlocked,
    wrapperClass,
    innerContainerClass,
    formClass,
    inputContainerClass,
    queuedSubmissionContainerClass,
    actionsContainerClass,
  } = useChatInputAreaLayout({
    isFullscreen,
    isPipActive,
    isAnimatingSend,
    isRecording: !!isRecording,
    inputDisabled,
  });
  const focusBlockingSelector =
    'button, a, input, textarea, select, label, summary, audio, video, [role="button"], [role="menuitem"], [contenteditable="true"]';

  const handleInputShellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest(focusBlockingSelector)) {
      return;
    }

    inputState.textareaRef.current?.focus();
  };

  const fileInputState: React.ComponentProps<typeof HiddenFileInputs>['fileInputs'] = {
    fileInputRef: modalsState.fileInputRef,
    imageInputRef: modalsState.imageInputRef,
    folderInputRef: modalsState.folderInputRef,
    zipInputRef: modalsState.zipInputRef,
    cameraInputRef: modalsState.cameraInputRef,
    handleFileChange: handlers.handleFileChange,
    handleFolderChange: handlers.handleFolderChange,
    handleZipChange: handlers.handleZipChange,
  };

  return (
    <div className={wrapperClass} aria-hidden={isUIBlocked}>
      {capabilities.isNativeAudioModel && (
        <video
          ref={liveAPI.videoRef}
          autoPlay
          muted
          playsInline
          aria-hidden="true"
          className="fixed h-px w-px opacity-0 pointer-events-none"
        />
      )}
      <div className="mx-auto w-full max-w-[44.8rem] px-2 sm:px-3">
        {chatInput.showEmptyStateSuggestions && capabilities.permissions.canGenerateSuggestions && !isFullscreen && (
          <ChatSuggestions
            show={chatInput.showEmptyStateSuggestions}
            onSuggestionClick={chatInput.onSuggestionClick}
            onOrganizeInfoClick={chatInput.onOrganizeInfoClick}
            onToggleBBox={chatInput.onToggleBBox}
            isBBoxModeActive={chatInput.isBBoxModeActive}
            onToggleGuide={chatInput.onToggleGuide}
            isGuideModeActive={chatInput.isGuideModeActive}
            isFullscreen={isFullscreen}
          />
        )}
      </div>

      <div className={innerContainerClass}>
        {/* Wrap toolbar in z-indexed container to ensure dropdowns render above status banner */}
        <div className="relative z-50">
          <ChatInputToolbar />
        </div>

        <LiveStatusBanner
          isConnected={liveAPI.isConnected}
          isSpeaking={liveAPI.isSpeaking}
          isReconnecting={liveAPI.isReconnecting}
          volume={liveAPI.volume}
          error={liveAPI.error}
          onDisconnect={liveAPI.disconnect}
        />

        <form onSubmit={handlers.handleSubmit} className={formClass}>
          <SlashCommandMenu
            isOpen={slashCommandState.slashCommandState.isOpen}
            commands={slashCommandState.slashCommandState.filteredCommands}
            onSelect={slashCommandState.handleCommandSelect}
            selectedIndex={slashCommandState.slashCommandState.selectedIndex}
            className={
              isFullscreen ? 'absolute bottom-[60px] left-0 right-0 mb-2 w-full max-w-6xl mx-auto z-20' : undefined
            }
          />
          {queuedSubmissionView && (
            <div className={queuedSubmissionContainerClass}>
              <QueuedSubmissionCard
                title={queuedSubmissionView.title}
                previewText={queuedSubmissionView.previewText}
                fileCount={queuedSubmissionView.fileCount}
                onEdit={queuedSubmissionView.onEdit}
                onRemove={queuedSubmissionView.onRemove}
              />
            </div>
          )}
          <div className={inputContainerClass} onClick={handleInputShellClick}>
            <ChatFilePreviewList
              selectedFiles={chatInput.selectedFiles}
              onRemove={handlers.removeSelectedFile}
              onCancelUpload={chatInput.onCancelUpload}
              onConfigure={localFileState.handleConfigureFile}
              onMoveTextToInput={localFileState.handleMoveTextFileToInput}
              onPreview={localFileState.handlePreviewFile}
              isGemini3={capabilities.isGemini3}
            />

            <ChatQuoteDisplay
              quotes={inputState.quotes}
              onRemoveQuote={(index: number) => inputState.setQuotes((prev) => prev.filter((_, i) => i !== index))}
              themeId={chatInput.themeId}
            />

            <ChatTextArea
              textareaRef={inputState.textareaRef}
              value={inputState.inputText}
              onChange={handlers.handleInputChange}
              onKeyDown={handlers.handleKeyDown}
              onPaste={handlers.handlePaste}
              onCompositionStart={handlers.onCompositionStart}
              onCompositionEnd={handlers.onCompositionEnd}
              placeholder={t('chatInputPlaceholder')}
              disabled={inputDisabled}
              isFullscreen={isFullscreen}
              isMobile={isMobile}
              initialTextareaHeight={initialTextareaHeight}
              isConverting={isConverting}
            />

            <div className={actionsContainerClass}>
              <ChatInputActions />
              <HiddenFileInputs fileInputs={fileInputState} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
