
import React from 'react';
import { ArrowUp, X, Edit2, Loader2, Mic, MicOff, Languages, Maximize2, Minimize2, Save, AudioWaveform, PhoneOff, Globe } from 'lucide-react';
import { AttachmentMenu } from './AttachmentMenu';
import { ToolsMenu } from './ToolsMenu';
import { IconStop } from '../../icons/CustomIcons';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../constants/appConstants';
import { ChatInputActionsProps } from '../../../types';

export interface ExtendedChatInputActionsProps extends ChatInputActionsProps {
    editMode?: 'update' | 'resend';
    isNativeAudioModel?: boolean;
    onStartLiveSession?: () => void;
    isLiveConnected?: boolean;
    isLiveMuted?: boolean;
    onToggleLiveMute?: () => void;
}

export const ChatInputActions: React.FC<ExtendedChatInputActionsProps> = ({
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
  t,
  onCancelRecording,
  onTranslate,
  isTranslating,
  inputText,
  onToggleFullscreen,
  isFullscreen,
  editMode,
  isNativeAudioModel,
  onStartLiveSession,
  isLiveConnected,
  isLiveMuted,
  onToggleLiveMute,
  onFastSendMessage,
}) => {
  const micIconSize = 20;
  const sendIconSize = 20;

  return (
    <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
            <AttachmentMenu onAction={onAttachmentAction} disabled={disabled} t={t as any} />
            
            {/* Live API: Standalone Web Search Button */}
            {isNativeAudioModel && (
                <button
                    type="button"
                    onClick={onToggleGoogleSearch}
                    disabled={disabled}
                    className={`${CHAT_INPUT_BUTTON_CLASS} ${isGoogleSearchEnabled ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                    aria-label={t('web_search_label')}
                    title={t('web_search_label')}
                >
                    <Globe size={20} strokeWidth={2} />
                </button>
            )}

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
                onCountTokens={onCountTokens}
                disabled={disabled}
                t={t as any}
                isNativeAudioModel={isNativeAudioModel}
            />
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            {isRecording && (
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancelRecording(); }}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md transition-colors"
                    aria-label={t('cancelRecording_aria')}
                    title={t('cancelRecording_aria')}
                >
                    {t('cancel')}
                </button>
            )}
            
            {onToggleFullscreen && !isNativeAudioModel && (
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

            {!isNativeAudioModel && (
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
            )}

            {/* Live Session Mute Button */}
            {isNativeAudioModel && isLiveConnected && onToggleLiveMute && (
                <button
                    type="button"
                    onClick={onToggleLiveMute}
                    disabled={disabled}
                    className={`${CHAT_INPUT_BUTTON_CLASS} ${isLiveMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                    aria-label={isLiveMuted ? "Unmute Microphone" : "Mute Microphone"}
                    title={isLiveMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                     {isLiveMuted ? <MicOff size={micIconSize} strokeWidth={2} /> : <Mic size={micIconSize} strokeWidth={2} />}
                </button>
            )}

            {/* Live Session Button for Native Audio Model */}
            {isNativeAudioModel && onStartLiveSession && !isRecording && !isTranscribing && (
                <button
                    type="button"
                    onClick={onStartLiveSession}
                    disabled={disabled}
                    className={`${CHAT_INPUT_BUTTON_CLASS} ${isLiveConnected ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 animate-pulse' : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'}`}
                    aria-label={isLiveConnected ? "End Live Session" : "Start Live Session"}
                    title={isLiveConnected ? "End Live Session" : "Start Live Session"}
                >
                    {isLiveConnected ? (
                        <PhoneOff size={micIconSize} strokeWidth={2} />
                    ) : (
                        <AudioWaveform size={micIconSize} strokeWidth={2} />
                    )}
                </button>
            )}

            {/* Standard Record Button */}
            {!isLiveConnected && !isNativeAudioModel && (
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
            )}

            {isLoading ? ( 
                <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStopGenerating(); }} 
                    className={`${CHAT_INPUT_BUTTON_CLASS} bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]`} 
                    aria-label={t('stopGenerating_aria')} 
                    title={t('stopGenerating_title')}
                >
                    <IconStop size={12} />
                </button>
            ) : isEditing ? (
                <>
                    <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancelEdit(); }} 
                        className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)]`} 
                        aria-label={t('cancelEdit_aria')} 
                        title={t('cancelEdit_title')}
                    >
                        <X size={sendIconSize} strokeWidth={2} />
                    </button>
                    <button type="submit" disabled={!canSend} className={`${CHAT_INPUT_BUTTON_CLASS} bg-amber-500 hover:bg-amber-600 text-white disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} aria-label={t('updateMessage_aria')} title={t('updateMessage_title')}>
                        {editMode === 'update' ? <Save size={sendIconSize} strokeWidth={2} /> : <Edit2 size={sendIconSize} strokeWidth={2} />}
                    </button>
                </>
            ) : (
                <button 
                    type="submit" 
                    disabled={!canSend || isWaitingForUpload} 
                    className={`${CHAT_INPUT_BUTTON_CLASS} bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} 
                    aria-label={isWaitingForUpload ? "Waiting for upload..." : t('sendMessage_aria')} 
                    title={isWaitingForUpload ? "Waiting for upload to complete before sending" : (t('sendMessage_title') + (onFastSendMessage ? t('sendMessage_fast_suffix', " (Right-click for Fast Mode ⚡)") : ""))}
                    onContextMenu={(e) => {
                        if (onFastSendMessage && !isWaitingForUpload && canSend) {
                            e.preventDefault();
                            onFastSendMessage();
                        }
                    }}
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
