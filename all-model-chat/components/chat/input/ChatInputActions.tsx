
import React from 'react';
import { ArrowUp, X, Edit2, Loader2, Mic, Languages, Maximize2, Minimize2 } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { AttachmentAction, AttachmentMenu } from './AttachmentMenu';
import { ToolsMenu } from './ToolsMenu';
import { IconStop } from '../../icons/CustomIcons';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../constants/appConstants';

export interface ChatInputActionsProps {
  onAttachmentAction: (action: AttachmentAction) => void;
  disabled: boolean;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
  isUrlContextEnabled: boolean;
  onToggleUrlContext: () => void;
  isDeepSearchEnabled: boolean;
  onToggleDeepSearch: () => void;
  onAddYouTubeVideo: () => void;
  onRecordButtonClick: () => void;
  isRecording?: boolean;
  isMicInitializing?: boolean;
  isTranscribing: boolean;
  isLoading: boolean;
  onStopGenerating: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  canSend: boolean;
  isWaitingForUpload: boolean;
  t: (key: keyof typeof translations) => string;
  onCancelRecording: () => void;
  onTranslate: () => void;
  isTranslating: boolean;
  inputText: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const ChatInputActions: React.FC<ChatInputActionsProps> = ({
  onAttachmentAction,
  disabled,
  isGoogleSearchEnabled,
  onToggleGoogleSearch,
  isCodeExecutionEnabled,
  onToggleCodeExecution,
  isUrlContextEnabled,
  onToggleUrlContext,
  isDeepSearchEnabled,
  onToggleDeepSearch,
  onAddYouTubeVideo,
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
  t,
  onCancelRecording,
  onTranslate,
  isTranslating,
  inputText,
  onToggleFullscreen,
  isFullscreen,
}) => {
  const micIconSize = 18;
  const sendIconSize = 18;

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
                isDeepSearchEnabled={isDeepSearchEnabled}
                onToggleDeepSearch={onToggleDeepSearch}
                onAddYouTubeVideo={onAddYouTubeVideo}
                disabled={disabled}
                t={t}
            />
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
            {isRecording && (
                <button
                    type="button"
                    onClick={onCancelRecording}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md transition-colors"
                    aria-label={t('cancelRecording_aria')}
                    title={t('cancelRecording_aria')}
                >
                    {t('cancel')}
                </button>
            )}
            
            {onToggleFullscreen && (
                <button
                    type="button"
                    onClick={onToggleFullscreen}
                    disabled={disabled}
                    className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
                    aria-label={isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand')}
                    title={isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand')}
                >
                    {isFullscreen ? <Minimize2 size={micIconSize} strokeWidth={2} /> : <Maximize2 size={micIconSize} strokeWidth={2} />}
                </button>
            )}

            <button
                type="button"
                onClick={onTranslate}
                disabled={!inputText.trim() || isEditing || disabled || isTranscribing || isMicInitializing || isTranslating}
                className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
                aria-label={isTranslating ? t('translating_button_title') : t('translate_button_title')}
                title={isTranslating ? t('translating_button_title') : t('translate_button_title')}
            >
                {isTranslating ? (
                    <Loader2 size={micIconSize} className="animate-spin text-[var(--theme-text-link)]" strokeWidth={2} />
                ) : (
                    <Languages size={micIconSize} strokeWidth={2} />
                )}
            </button>
            <button
                type="button"
                onClick={onRecordButtonClick}
                disabled={disabled || isTranscribing || isMicInitializing}
                className={`${CHAT_INPUT_BUTTON_CLASS} ${isRecording ? 'mic-recording-animate' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                aria-label={
                    isRecording ? t('voiceInput_stop_aria') :
                    isTranscribing ? t('voiceInput_transcribing_aria') : 
                    isMicInitializing ? t('mic_initializing') : t('voiceInput_start_aria')
                }
                title={
                    isRecording ? t('voiceInput_stop_aria') :
                    isTranscribing ? t('voiceInput_transcribing_aria') : 
                    isMicInitializing ? t('mic_initializing') : t('voiceInput_start_aria')
                }
            >
                {isTranscribing || isMicInitializing ? (
                    <Loader2 size={micIconSize} className="animate-spin text-[var(--theme-text-link)]" strokeWidth={2} />
                ) : (
                    <Mic size={micIconSize} strokeWidth={2} />
                )}
            </button>

            {isLoading ? ( 
                <button type="button" onClick={onStopGenerating} className={`${CHAT_INPUT_BUTTON_CLASS} bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]`} aria-label={t('stopGenerating_aria')} title={t('stopGenerating_title')}><IconStop size={12} /></button>
            ) : isEditing ? (
                <>
                    <button type="button" onClick={onCancelEdit} className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)]`} aria-label={t('cancelEdit_aria')} title={t('cancelEdit_title')}><X size={sendIconSize} strokeWidth={2} /></button>
                    <button type="submit" disabled={!canSend} className={`${CHAT_INPUT_BUTTON_CLASS} bg-amber-500 hover:bg-amber-600 text-white disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} aria-label={t('updateMessage_aria')} title={t('updateMessage_title')}><Edit2 size={sendIconSize} strokeWidth={2} /></button>
                </>
            ) : (
                <button 
                    type="submit" 
                    disabled={!canSend || isWaitingForUpload} 
                    className={`${CHAT_INPUT_BUTTON_CLASS} bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} 
                    aria-label={isWaitingForUpload ? "Waiting for upload..." : t('sendMessage_aria')} 
                    title={isWaitingForUpload ? "Waiting for upload to complete before sending" : t('sendMessage_title')}
                >
                    {isWaitingForUpload ? (
                        <Loader2 size={sendIconSize} className="animate-spin" strokeWidth={2} />
                    ) : (
                        <ArrowUp size={sendIconSize} strokeWidth={2} />
                    )}
                </button>
            )}
        </div>
    </div>
  );
};
