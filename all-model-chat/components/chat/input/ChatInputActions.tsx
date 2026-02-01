import React from 'react';
import { AttachmentMenu } from './AttachmentMenu';
import { ToolsMenu } from './ToolsMenu';
import { ChatInputActionsProps } from '../../../types';
import { WebSearchToggle } from './actions/WebSearchToggle';
import { LiveControls } from './actions/LiveControls';
import { RecordControls } from './actions/RecordControls';
import { UtilityControls } from './actions/UtilityControls';
import { SendControls } from './actions/SendControls';

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
  return (
    <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
            <AttachmentMenu onAction={onAttachmentAction} disabled={disabled} t={t as any} />
            
            {isNativeAudioModel && (
                <WebSearchToggle 
                    isGoogleSearchEnabled={isGoogleSearchEnabled} 
                    onToggleGoogleSearch={onToggleGoogleSearch} 
                    disabled={disabled} 
                    t={t as any} 
                />
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
            {!isLiveConnected && !isNativeAudioModel && (
                <RecordControls 
                    isRecording={!!isRecording}
                    isTranscribing={isTranscribing}
                    isMicInitializing={!!isMicInitializing}
                    onRecordButtonClick={onRecordButtonClick}
                    onCancelRecording={onCancelRecording}
                    disabled={disabled}
                    t={t as any}
                />
            )}
            
            {!isNativeAudioModel && (
                <UtilityControls 
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={onToggleFullscreen}
                    isTranslating={isTranslating}
                    onTranslate={onTranslate}
                    disabled={disabled}
                    canTranslate={!!inputText.trim() && !isEditing && !isTranscribing && !isMicInitializing}
                    t={t as any}
                />
            )}

            {isNativeAudioModel && onStartLiveSession && (
                <LiveControls 
                    isLiveConnected={!!isLiveConnected}
                    isLiveMuted={isLiveMuted}
                    onStartLiveSession={onStartLiveSession}
                    onToggleLiveMute={onToggleLiveMute}
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
                t={t as any}
            />
        </div>
    </div>
  );
};