import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, ArrowUp, CornerDownLeft, Ban } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { IconStop } from '@/components/icons/CustomIcons';
import { CHAT_INPUT_BUTTON_CLASS } from '@/constants/appConstants';
import { useChatInputRuntime } from '@/components/layout/chat-runtime/ChatRuntimeContext';
import { useChatStore } from '@/stores/chatStore';
import {
  useChatInputActionsContext,
  useChatInputComposerStatusContext,
} from '@/components/chat/input/ChatInputContext';

interface Ripple {
  x: number;
  y: number;
  id: number;
  size: number;
}

export const SendControls: React.FC = () => {
  const { isLoading, isWaitingForUpload } = useChatInputActionsContext();
  const { canSend, canQueueMessage, onFastSendMessage, onQueueMessage, onCancelPendingUploadSend } =
    useChatInputComposerStatusContext();
  const isEditing = !!useChatStore((state) => state.editingMessageId);
  const editMode = useChatStore((state) => state.editMode);
  const { onStopGenerating, onCancelEdit } = useChatInputRuntime();
  const { t } = useI18n();
  const iconSize = 18;
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const mainButtonSizeClass = '!h-10 !w-10';

  useEffect(() => {
    if (ripples.length > 0) {
      const timeout = setTimeout(() => setRipples([]), 600);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [ripples]);

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    setRipples((prev) => [...prev, { x, y, id: Date.now(), size }]);
  };

  // Determine state priorities
  const isStop = isLoading;
  const isUpload = !isLoading && isWaitingForUpload;
  const isEdit = !isLoading && isEditing;
  const isSend = !isLoading && !isEditing && !isWaitingForUpload;

  // Determine disabled state
  // Note: Stop button is never disabled by canSend.
  const isDisabled = !isLoading && !isUpload && !canSend;

  // Determine background class
  let bgClass = 'bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)]';

  if (isDisabled && !isUpload) {
    bgClass = 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] cursor-not-allowed';
  } else if (isStop) {
    bgClass = 'bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]';
  } else if (isEdit) {
    bgClass = 'bg-amber-500 hover:bg-amber-600 text-white';
  } else if (isUpload) {
    bgClass = 'bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]';
  }

  // Determine shape class for morphing
  // Stop button is squarer (rounded-xl) to match stop icon metaphor
  // Others are circular (rounded-full)
  // Using explicit pixel radius or consistent scale ensures smoother transition than mixed units
  const shapeClass = isStop ? '!rounded-[10px]' : '!rounded-full';

  // Handlers
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Create ripple if button is interactive
    if (!isDisabled) {
      createRipple(e);
    }

    if (isStop) {
      e.preventDefault();
      e.stopPropagation();
      onStopGenerating();
    } else if (isUpload) {
      e.preventDefault();
      e.stopPropagation();
      onCancelPendingUploadSend();
    } else if (isDisabled) {
      e.preventDefault();
    }
    // For submit (send/edit), we let the form handler take over unless blocked
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isSend && !isDisabled) {
      e.preventDefault();
      createRipple(e);
      onFastSendMessage();
    }
  };

  // Text & Tooltips
  let label = t('sendMessage_aria');
  let title = t('sendMessage_title');

  if (isStop) {
    label = t('stopGenerating_aria');
    title = t('stopGenerating_title');
  } else if (isEdit) {
    label = t('updateMessage_aria');
    title = t('updateMessage_title');
  } else if (isUpload) {
    label = t('cancelPendingUploadSend_aria');
    title = t('cancelPendingUploadSend_title');
  } else if (isSend && !isDisabled) {
    title = t('sendMessage_title') + t('sendMessage_fast_suffix', ' (Right-click for Fast Mode ⚡)');
  }

  const renderIcon = (
    active: boolean,
    Icon: React.ElementType,
    props: React.SVGProps<SVGSVGElement> & { size?: number } = {},
  ) => (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${active ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}
      aria-hidden={!active}
    >
      <Icon {...props} />
    </div>
  );

  return (
    <div className="flex items-center">
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden flex items-center ${canQueueMessage ? 'max-w-[64px] opacity-100 mr-2' : 'max-w-0 opacity-0 mr-0'}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQueueMessage?.();
          }}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)]`}
          aria-label={t('queueMessage_aria')}
          title={t('queueMessage_title')}
          disabled={!canQueueMessage}
          tabIndex={canQueueMessage ? 0 : -1}
        >
          <CornerDownLeft size={iconSize - 1} strokeWidth={2} />
        </button>
      </div>

      {/* Cancel Edit Button - Animates in/out */}
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden flex items-center ${isEditing ? 'max-w-[50px] opacity-100 mr-2' : 'max-w-0 opacity-0 mr-0'}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancelEdit();
          }}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)]`}
          aria-label={t('cancelEdit_aria')}
          title={t('cancelEdit_title')}
          disabled={!isEditing}
          tabIndex={isEditing ? 0 : -1}
        >
          <X size={iconSize} strokeWidth={2} />
        </button>
      </div>

      {/* Main Action Button */}
      <button
        type={isStop || isUpload ? 'button' : 'submit'}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={!isStop && isDisabled}
        className={`${CHAT_INPUT_BUTTON_CLASS} ${mainButtonSizeClass} ${bgClass} ${shapeClass} relative overflow-hidden transition-colors duration-150 shadow-sm`}
        aria-label={label}
        title={title}
      >
        {/* Ripples */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}

        {/* Icons stack on top of each other and fade/rotate in/out */}
        {renderIcon(isStop, IconStop, { size: 10 })}
        {renderIcon(isUpload, Ban, { size: iconSize - 1, strokeWidth: 2 })}
        {renderIcon(isEdit, editMode === 'update' ? Save : Edit2, { size: iconSize, strokeWidth: 2 })}
        {renderIcon(isSend, ArrowUp, { size: iconSize, strokeWidth: 2 })}
      </button>
    </div>
  );
};
