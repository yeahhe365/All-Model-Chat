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
import { useChatInputView } from './ChatInputViewContext';
import { HiddenFileInputs } from './HiddenFileInputs';
import { useChatInputAreaLayout } from './useChatInputAreaLayout';

export const ChatInputArea: React.FC = () => {
  const {
    toolbarProps,
    actionsProps,
    slashCommandProps,
    fileDisplayProps,
    inputProps,
    quoteProps,
    queuedSubmissionProps,
    layoutProps,
    fileInputs,
    formProps,
    suggestionsProps,
    liveStatusProps,
    liveVideoProps,
    themeId,
  } = useChatInputView();
  const { isFullscreen, isPipActive, isAnimatingSend, isMobile, initialTextareaHeight, isConverting } = layoutProps;
  const { isRecording } = actionsProps;

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
    inputDisabled: inputProps.disabled,
  });
  const focusBlockingSelector =
    'button, a, input, textarea, select, label, summary, audio, video, [role="button"], [role="menuitem"], [contenteditable="true"]';

  const handleInputShellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest(focusBlockingSelector)) {
      return;
    }

    inputProps.textareaRef.current?.focus();
  };

  return (
    <div className={wrapperClass} aria-hidden={isUIBlocked}>
      {liveVideoProps && (
        <video
          ref={liveVideoProps.videoRef}
          autoPlay
          muted
          playsInline
          aria-hidden="true"
          className="fixed h-px w-px opacity-0 pointer-events-none"
        />
      )}
      <div className="mx-auto w-full max-w-[44.8rem] px-2 sm:px-3">
        {suggestionsProps && !isFullscreen && (
          <ChatSuggestions
            show={suggestionsProps.show}
            onSuggestionClick={suggestionsProps.onSuggestionClick}
            onOrganizeInfoClick={suggestionsProps.onOrganizeInfoClick}
            onToggleBBox={suggestionsProps.onToggleBBox}
            isBBoxModeActive={suggestionsProps.isBBoxModeActive}
            onToggleGuide={suggestionsProps.onToggleGuide}
            isGuideModeActive={suggestionsProps.isGuideModeActive}
            isFullscreen={isFullscreen}
          />
        )}
      </div>

      <div className={innerContainerClass}>
        {/* Wrap toolbar in z-indexed container to ensure dropdowns render above status banner */}
        <div className="relative z-50">
          <ChatInputToolbar {...toolbarProps} />
        </div>

        {liveStatusProps && <LiveStatusBanner {...liveStatusProps} />}

        <form onSubmit={formProps.onSubmit} className={formClass}>
          <SlashCommandMenu
            isOpen={slashCommandProps.isOpen}
            commands={slashCommandProps.commands}
            onSelect={slashCommandProps.onSelect}
            selectedIndex={slashCommandProps.selectedIndex}
            className={
              isFullscreen ? 'absolute bottom-[60px] left-0 right-0 mb-2 w-full max-w-6xl mx-auto z-20' : undefined
            }
          />
          {queuedSubmissionProps && (
            <div className={queuedSubmissionContainerClass}>
              <QueuedSubmissionCard
                title={queuedSubmissionProps.title}
                previewText={queuedSubmissionProps.previewText}
                fileCount={queuedSubmissionProps.fileCount}
                onEdit={queuedSubmissionProps.onEdit}
                onRemove={queuedSubmissionProps.onRemove}
              />
            </div>
          )}
          <div className={inputContainerClass} onClick={handleInputShellClick}>
            <ChatFilePreviewList
              selectedFiles={fileDisplayProps.selectedFiles}
              onRemove={fileDisplayProps.onRemove}
              onCancelUpload={fileDisplayProps.onCancelUpload}
              onConfigure={fileDisplayProps.onConfigure}
              onMoveTextToInput={fileDisplayProps.onMoveTextToInput}
              onPreview={fileDisplayProps.onPreview}
              isGemini3={fileDisplayProps.isGemini3}
            />

            {quoteProps && (
              <ChatQuoteDisplay quotes={quoteProps.quotes} onRemoveQuote={quoteProps.onRemoveQuote} themeId={themeId} />
            )}

            <ChatTextArea
              textareaRef={inputProps.textareaRef}
              value={inputProps.value}
              onChange={inputProps.onChange}
              onKeyDown={inputProps.onKeyDown}
              onPaste={inputProps.onPaste}
              onCompositionStart={inputProps.onCompositionStart}
              onCompositionEnd={inputProps.onCompositionEnd}
              onFocus={inputProps.onFocus}
              placeholder={inputProps.placeholder}
              disabled={inputProps.disabled}
              isFullscreen={isFullscreen}
              isMobile={isMobile}
              initialTextareaHeight={initialTextareaHeight}
              isConverting={isConverting}
            />

            <div className={actionsContainerClass}>
              <ChatInputActions {...actionsProps} />
              <HiddenFileInputs fileInputs={fileInputs} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
