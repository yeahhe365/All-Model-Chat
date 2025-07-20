import React from 'react';
import { ArrowUp, Ban, X, Edit2, Loader2, Mic, StopCircle } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { AttachmentAction, AttachmentMenu } from './AttachmentMenu';
import { ToolsMenu } from './ToolsMenu';
import { ChatInputActionsProps } from '../../../types';

export const ChatInputActions: React.FC<ChatInputActionsProps> = ({
  onAttachmentAction,
  disabled,
  isGoogleSearchEnabled,
  onToggleGoogleSearch,
  isCodeExecutionEnabled,
  onToggleCodeExecution,
  isUrlContextEnabled,
  onToggleUrlContext,
  onRecordButtonClick,
  isRecording,
  isTranscribing,
  isLoading,
  onStopGenerating,
  isEditing,
  onCancelEdit,
  canSend,
  isWaitingForUpload,
  t,
}) => {
  const micIconSize = 18;
  const sendIconSize = 18;
  const buttonBaseClass = "h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-input)]";

  return (
    <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1">
            <AttachmentMenu onAction={onAttachmentAction} disabled={disabled} t={t} />
            <ToolsMenu
                isGoogleSearchEnabled={isGoogleSearchEnabled}
                onToggleGoogleSearch={onToggleGoogleSearch}
                isCodeExecutionEnabled={isCodeExecutionEnabled}
                onToggleCodeExecution={onToggleCodeExecution}
                isUrlContextEnabled={isUrlContextEnabled}
                onToggleUrlContext={onToggleUrlContext}
                disabled={disabled}
                t={t}
            />
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
            <button
                type="button"
                onClick={onRecordButtonClick}
                disabled={isLoading || isEditing || disabled}
                className={`${buttonBaseClass} ${isRecording ? 'mic-recording-animate' : 'bg-transparent text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                aria-label={
                    isRecording ? t('voiceInput_stop_aria') :
                    isTranscribing ? t('voiceInput_transcribing_aria') : t('voiceInput_start_aria')
                }
                title={
                    isRecording ? t('voiceInput_stop_aria') :
                    isTranscribing ? t('voiceInput_transcribing_aria') : t('voiceInput_start_aria')
                }
            >
                {isTranscribing ? (
                    <Loader2 size={micIconSize} className="animate-spin text-[var(--theme-text-link)]" />
                ) : isRecording ? (
                    <StopCircle size={micIconSize} />
                ) : (
                    <Mic size={micIconSize} />
                )}
            </button>

            {isLoading ? ( 
                <button type="button" onClick={onStopGenerating} className={`${buttonBaseClass} bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]`} aria-label={t('stopGenerating_aria')} title={t('stopGenerating_title')}><Ban size={sendIconSize} /></button>
            ) : isEditing ? (
                <>
                    <button type="button" onClick={onCancelEdit} className={`${buttonBaseClass} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]`} aria-label={t('cancelEdit_aria')} title={t('cancelEdit_title')}><X size={sendIconSize} /></button>
                    <button type="submit" disabled={!canSend} className={`${buttonBaseClass} bg-amber-500 hover:bg-amber-600 text-white disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} aria-label={t('updateMessage_aria')} title={t('updateMessage_title')}><Edit2 size={sendIconSize} /></button>
                </>
            ) : (
                <button 
                    type="submit" 
                    disabled={!canSend || isWaitingForUpload} 
                    className={`${buttonBaseClass} bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} 
                    aria-label={isWaitingForUpload ? "Waiting for upload..." : t('sendMessage_aria')} 
                    title={isWaitingForUpload ? "Waiting for upload to complete before sending" : t('sendMessage_title')}
                >
                    {isWaitingForUpload ? (
                        <Loader2 size={sendIconSize} className="animate-spin" />
                    ) : (
                        <ArrowUp size={sendIconSize} />
                    )}
                </button>
            )}
        </div>
    </div>
  );
};