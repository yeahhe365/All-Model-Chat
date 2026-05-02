import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

const ACTION_ROW_GAP_PX = 8;
const ACTION_ROW_OVERFLOW_BUFFER_PX = 4;

interface AuxiliaryActionCollapseState {
  measurementSignature: string;
  shouldCollapse: boolean;
}

export const ChatInputActions: React.FC<ExtendedChatInputActionsProps> = ({
  onAttachmentAction,
  disabled,
  currentModelId,
  isImageModel,
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const leftActionsRef = useRef<HTMLDivElement | null>(null);
  const rightActionsRef = useRef<HTMLDivElement | null>(null);
  const expandedRightWidthRef = useRef(0);
  const measurementSignature = useMemo(
    () =>
      [
        hasComposerMoreActions,
        isNativeAudioModel,
        isLiveConnected,
        !!onStartLiveSession,
        !!onToggleFullscreen,
        showInputTranslationButton,
        showClearButton,
        showPasteButton,
        isLoading,
        isEditing,
        isWaitingForUpload,
        canQueueMessage,
      ].join('|'),
    [
      canQueueMessage,
      hasComposerMoreActions,
      isEditing,
      isLiveConnected,
      isLoading,
      isNativeAudioModel,
      isWaitingForUpload,
      onStartLiveSession,
      onToggleFullscreen,
      showClearButton,
      showInputTranslationButton,
      showPasteButton,
    ],
  );
  const [auxiliaryActionCollapseState, setAuxiliaryActionCollapseState] = useState<AuxiliaryActionCollapseState>({
    measurementSignature,
    shouldCollapse: false,
  });
  const shouldCollapseAuxiliaryActions =
    auxiliaryActionCollapseState.measurementSignature === measurementSignature
      ? auxiliaryActionCollapseState.shouldCollapse
      : false;
  const showAuxiliaryActionsInMenu = hasComposerMoreActions && shouldCollapseAuxiliaryActions;

  const measureActionRow = useCallback(() => {
    const root = rootRef.current;
    const leftActions = leftActionsRef.current;
    const rightActions = rightActionsRef.current;

    if (!root || !leftActions || !rightActions) {
      return;
    }

    if (!hasComposerMoreActions) {
      expandedRightWidthRef.current = 0;
      setAuxiliaryActionCollapseState((current) =>
        current.measurementSignature === measurementSignature && !current.shouldCollapse
          ? current
          : { measurementSignature, shouldCollapse: false },
      );
      return;
    }

    const containerWidth = root.getBoundingClientRect().width;
    const leftWidth = leftActions.getBoundingClientRect().width;
    const currentRightWidth = rightActions.getBoundingClientRect().width;

    if (containerWidth <= 0 || currentRightWidth <= 0) {
      return;
    }

    if (!shouldCollapseAuxiliaryActions) {
      expandedRightWidthRef.current = currentRightWidth;
    }

    const expandedRightWidth = expandedRightWidthRef.current || currentRightWidth;
    const requiredWidth = leftWidth + expandedRightWidth + ACTION_ROW_GAP_PX + ACTION_ROW_OVERFLOW_BUFFER_PX;
    const nextShouldCollapse = requiredWidth > containerWidth;

    setAuxiliaryActionCollapseState((current) =>
      current.measurementSignature === measurementSignature && current.shouldCollapse === nextShouldCollapse
        ? current
        : { measurementSignature, shouldCollapse: nextShouldCollapse },
    );
  }, [hasComposerMoreActions, measurementSignature, shouldCollapseAuxiliaryActions]);

  useLayoutEffect(() => {
    const animationFrameId = window.requestAnimationFrame(measureActionRow);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [measureActionRow]);

  useEffect(() => {
    const root = rootRef.current;
    const leftActions = leftActionsRef.current;
    const rightActions = rightActionsRef.current;

    if (!root || !leftActions || !rightActions) {
      return undefined;
    }

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measureActionRow);
      return () => window.removeEventListener('resize', measureActionRow);
    }

    const resizeObserver = new ResizeObserver(() => measureActionRow());
    resizeObserver.observe(root);
    resizeObserver.observe(leftActions);
    resizeObserver.observe(rightActions);

    return () => resizeObserver.disconnect();
  }, [measureActionRow]);

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
    <div
      ref={rootRef}
      data-testid="chat-input-actions-root"
      className="flex w-full items-center justify-between gap-2 overflow-hidden"
    >
      <div
        ref={leftActionsRef}
        data-testid="chat-input-actions-left"
        className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
          currentModelId={currentModelId}
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

      <div
        ref={rightActionsRef}
        data-testid="chat-input-actions-right"
        className="flex min-w-0 flex-shrink-0 items-center gap-1.5 sm:gap-3"
      >
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

        {!isNativeAudioModel && !showAuxiliaryActionsInMenu && (
          <div className="flex items-center gap-2 sm:gap-3">
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

        {!showAuxiliaryActionsInMenu && (showClearButton || showPasteButton) && (
          <div className="flex items-center gap-2 sm:gap-3">{renderDesktopPasteClearControls()}</div>
        )}

        {showAuxiliaryActionsInMenu && (
          <div>
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
