import React from 'react';
import { ClipboardPaste, Eraser } from 'lucide-react';
import { AttachmentMenu } from './AttachmentMenu';
import { ToolsMenu } from './ToolsMenu';
import { ChatInputActionsProps } from '../../../types';
import { WebSearchToggle } from './actions/WebSearchToggle';
import { LiveControls } from './actions/LiveControls';
import { RecordControls } from './actions/RecordControls';
import { UtilityControls } from './actions/UtilityControls';
import { SendControls } from './actions/SendControls';
import { ComposerMoreMenu } from './actions/ComposerMoreMenu';
import { useI18n } from '../../../contexts/I18nContext';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../constants/appConstants';

interface ExtendedChatInputActionsProps extends ChatInputActionsProps {
  editMode?: 'update' | 'resend';
  isNativeAudioModel?: boolean;
  onStartLiveSession?: () => void;
  onDisconnectLiveSession?: () => void;
  isLiveConnected?: boolean;
  isLiveMuted?: boolean;
  onToggleLiveMute?: () => void;
  onStartLiveCamera?: () => void;
  onStartLiveScreenShare?: () => void;
  onStopLiveVideo?: () => void;
  liveVideoSource?: 'camera' | 'screen' | null;
}

export const ChatInputActions: React.FC<ExtendedChatInputActionsProps> = ({
  onAttachmentAction,
  disabled,
  isImageModel,
  isGemini3ImageModel,
  supportsBuiltInCustomToolCombination,
  isGemmaModel,
  isRealImagenModel,
  isGoogleSearchEnabled,
  onToggleGoogleSearch,
  isCodeExecutionEnabled,
  onToggleCodeExecution,
  isLocalPythonEnabled,
  onToggleLocalPython,
  isUrlContextEnabled,
  onToggleUrlContext,
  isDeepSearchEnabled,
  onToggleDeepSearch,
  onAddYouTubeVideo,
  onCountTokens,
  onRecordButtonClick,
  isRecording,
  isMicInitializing,
  isTranscribing,
  isLoading,
  onStopGenerating,
  isEditing,
  onCancelEdit,
  canSend,
  isWaitingForUpload,
  onCancelRecording,
  onTranslate,
  showInputTranslationButton,
  onPasteFromClipboard,
  showInputPasteButton,
  onClearInput,
  showInputClearButton,
  isTranslating,
  inputText,
  onToggleFullscreen,
  isFullscreen,
  editMode,
  isNativeAudioModel,
  onStartLiveSession,
  onDisconnectLiveSession,
  isLiveConnected,
  isLiveMuted,
  onToggleLiveMute,
  onStartLiveCamera,
  onStartLiveScreenShare,
  onStopLiveVideo,
  liveVideoSource,
  onFastSendMessage,
  canQueueMessage,
  onQueueMessage,
}) => {
  const { t } = useI18n();
  const canTranslate = !!inputText.trim() && !isEditing && !isTranscribing && !isMicInitializing;
  const canUseInputUtility = !disabled && !isLoading && !isWaitingForUpload;
  const showClearButton = showInputClearButton && onClearInput;
  const showPasteButton = showInputPasteButton && onPasteFromClipboard;
  const hasComposerMoreActions =
    (!isNativeAudioModel && (onToggleFullscreen || showInputTranslationButton)) || showClearButton || showPasteButton;

  const renderDesktopPasteClearControls = () => (
    <>
      {showClearButton && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClearInput();
          }}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
          aria-label={t('clearInput_aria')}
          title={t('clearInput_title')}
          data-testid="clear-input-button"
          disabled={!canUseInputUtility}
        >
          <Eraser size={18} strokeWidth={2} />
        </button>
      )}

      {showPasteButton && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPasteFromClipboard();
          }}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
          aria-label={t('pasteClipboard_aria')}
          title={t('pasteClipboard_title')}
          data-testid="paste-button"
          disabled={!canUseInputUtility}
        >
          <ClipboardPaste size={18} strokeWidth={2} />
        </button>
      )}
    </>
  );

  return (
    <div className="flex w-full items-center justify-between gap-2 overflow-hidden">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AttachmentMenu
          onAction={onAttachmentAction}
          disabled={disabled || !!isRealImagenModel}
          isImageModel={isImageModel}
        />

        {isNativeAudioModel && (
          <WebSearchToggle
            isGoogleSearchEnabled={isGoogleSearchEnabled}
            onToggleGoogleSearch={onToggleGoogleSearch}
            disabled={disabled}
          />
        )}

        <ToolsMenu
          isImageModel={isImageModel}
          isGemini3ImageModel={isGemini3ImageModel}
          supportsBuiltInCustomToolCombination={supportsBuiltInCustomToolCombination}
          isGemmaModel={isGemmaModel}
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
          onAddYouTubeVideo={onAddYouTubeVideo}
          onCountTokens={onCountTokens}
          disabled={disabled}
          isNativeAudioModel={isNativeAudioModel}
        />
      </div>

      <div className="flex min-w-0 flex-shrink-0 items-center gap-1.5 sm:gap-3">
        {!isLiveConnected && !isNativeAudioModel && (
          <RecordControls
            isRecording={!!isRecording}
            isTranscribing={isTranscribing}
            isMicInitializing={!!isMicInitializing}
            onRecordButtonClick={onRecordButtonClick}
            onCancelRecording={onCancelRecording}
            disabled={disabled}
          />
        )}

        {!isNativeAudioModel && (
          <div className="hidden items-center gap-2 sm:flex sm:gap-3">
            <UtilityControls
              isFullscreen={isFullscreen}
              onToggleFullscreen={onToggleFullscreen}
              isTranslating={isTranslating}
              onTranslate={onTranslate}
              showTranslateButton={showInputTranslationButton ?? false}
              disabled={disabled}
              canTranslate={canTranslate}
            />
          </div>
        )}

        {(showClearButton || showPasteButton) && (
          <div className="hidden items-center gap-2 sm:flex sm:gap-3">{renderDesktopPasteClearControls()}</div>
        )}

        {hasComposerMoreActions && (
          <div className="sm:hidden">
            <ComposerMoreMenu
              isFullscreen={isFullscreen}
              onToggleFullscreen={isNativeAudioModel ? undefined : onToggleFullscreen}
              isTranslating={isTranslating}
              onTranslate={onTranslate}
              showTranslateButton={!isNativeAudioModel && (showInputTranslationButton ?? false)}
              canTranslate={canTranslate}
              onPasteFromClipboard={onPasteFromClipboard}
              showInputPasteButton={showInputPasteButton ?? true}
              onClearInput={onClearInput}
              showInputClearButton={showInputClearButton ?? false}
              disabled={disabled}
              isLoading={isLoading}
              isWaitingForUpload={isWaitingForUpload}
              isInputDisabled={disabled}
            />
          </div>
        )}

        {isNativeAudioModel && onStartLiveSession && (
          <LiveControls
            isLiveConnected={!!isLiveConnected}
            isLiveMuted={isLiveMuted}
            onStartLiveSession={onStartLiveSession}
            onDisconnectLiveSession={onDisconnectLiveSession}
            onToggleLiveMute={onToggleLiveMute}
            onStartLiveCamera={onStartLiveCamera}
            onStartLiveScreenShare={onStartLiveScreenShare}
            onStopLiveVideo={onStopLiveVideo}
            liveVideoSource={liveVideoSource}
            disabled={disabled}
            isRecording={!!isRecording}
            isTranscribing={isTranscribing}
          />
        )}

        <SendControls
          isLoading={isLoading}
          isEditing={isEditing}
          canSend={canSend}
          isWaitingForUpload={isWaitingForUpload}
          editMode={editMode}
          onStopGenerating={onStopGenerating}
          onCancelEdit={onCancelEdit}
          onFastSendMessage={onFastSendMessage}
          canQueueMessage={canQueueMessage}
          onQueueMessage={onQueueMessage}
        />
      </div>
    </div>
  );
};
