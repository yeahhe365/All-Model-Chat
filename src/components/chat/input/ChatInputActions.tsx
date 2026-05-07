import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AttachmentMenu } from './AttachmentMenu';
import { ToolsMenu } from './ToolsMenu';
import { WebSearchToggle } from './actions/WebSearchToggle';
import { LiveControls } from './actions/LiveControls';
import { RecordControls } from './actions/RecordControls';
import { UtilityControls } from './actions/UtilityControls';
import { SendControls } from './actions/SendControls';
import { ComposerMoreMenu } from './actions/ComposerMoreMenu';
import { useComposerAuxiliaryActions } from './actions/useComposerAuxiliaryActions';
import { useChatInputActionsContext, useChatInputComposerStatusContext } from './ChatInputContext';

const ACTION_ROW_GAP_PX = 8;
const ACTION_ROW_OVERFLOW_BUFFER_PX = 4;

interface AuxiliaryActionCollapseState {
  measurementSignature: string;
  shouldCollapse: boolean;
}

const ChatInputActionsComponent: React.FC = () => {
  const {
    disabled,
    isWaitingForUpload,
    onToggleFullscreen,
    isLiveConnected,
    isNativeAudioModel,
    onToggleToolAndFocus,
    onCountTokens,
    currentModelId,
    toolStates,
    isLoading,
    isEditing,
  } = useChatInputActionsContext();
  const { canQueueMessage } = useChatInputComposerStatusContext();
  const focusedToolStates = useMemo(
    () => ({
      googleSearch: {
        isEnabled: !!toolStates.googleSearch?.isEnabled,
        onToggle: toolStates.googleSearch?.onToggle
          ? () => onToggleToolAndFocus(toolStates.googleSearch!.onToggle!)
          : undefined,
      },
      codeExecution: {
        isEnabled: !!toolStates.codeExecution?.isEnabled,
        onToggle: toolStates.codeExecution?.onToggle
          ? () => onToggleToolAndFocus(toolStates.codeExecution!.onToggle!)
          : undefined,
      },
      localPython: {
        isEnabled: !!toolStates.localPython?.isEnabled,
        onToggle: toolStates.localPython?.onToggle
          ? () => onToggleToolAndFocus(toolStates.localPython!.onToggle!)
          : undefined,
      },
      urlContext: {
        isEnabled: !!toolStates.urlContext?.isEnabled,
        onToggle: toolStates.urlContext?.onToggle
          ? () => onToggleToolAndFocus(toolStates.urlContext!.onToggle!)
          : undefined,
      },
      deepSearch: {
        isEnabled: !!toolStates.deepSearch?.isEnabled,
        onToggle: toolStates.deepSearch?.onToggle
          ? () => onToggleToolAndFocus(toolStates.deepSearch!.onToggle!)
          : undefined,
      },
    }),
    [onToggleToolAndFocus, toolStates],
  );
  const toolUtilityActions = useMemo(
    () => ({
      onCountTokens,
    }),
    [onCountTokens],
  );
  const auxiliaryActions = useComposerAuxiliaryActions();
  const auxiliaryActionSignature = useMemo(
    () => auxiliaryActions.map((action) => `${action.id}:${action.disabled}`).join('|'),
    [auxiliaryActions],
  );
  const hasComposerMoreActions = auxiliaryActions.length > 0;
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
        !!onToggleFullscreen,
        auxiliaryActionSignature,
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
      onToggleFullscreen,
      auxiliaryActionSignature,
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
        <AttachmentMenu />

        {isNativeAudioModel && (
          <WebSearchToggle
            isGoogleSearchEnabled={!!focusedToolStates.googleSearch?.isEnabled}
            onToggleGoogleSearch={focusedToolStates.googleSearch?.onToggle ?? (() => undefined)}
            disabled={disabled}
          />
        )}

        <ToolsMenu
          currentModelId={currentModelId}
          toolStates={focusedToolStates}
          toolUtilityActions={toolUtilityActions}
          disabled={disabled}
        />
      </div>

      <div
        ref={rightActionsRef}
        data-testid="chat-input-actions-right"
        className="flex min-w-0 flex-shrink-0 items-center gap-1.5 sm:gap-3"
      >
        {!isLiveConnected && !isNativeAudioModel && <RecordControls />}

        {!showAuxiliaryActionsInMenu && auxiliaryActions.length > 0 && (
          <div className="flex items-center gap-2 sm:gap-3">
            <UtilityControls actions={auxiliaryActions} />
          </div>
        )}

        {showAuxiliaryActionsInMenu && (
          <div>
            <ComposerMoreMenu
              actions={auxiliaryActions}
              disabled={disabled && auxiliaryActions.every((action) => action.disabled)}
            />
          </div>
        )}

        {isNativeAudioModel && <LiveControls />}

        <SendControls />
      </div>
    </div>
  );
};

export const ChatInputActions = React.memo(ChatInputActionsComponent);
