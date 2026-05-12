import React from 'react';
import { type ChatMessage, type UploadedFile, type SideViewContent } from '@/types';
import { MessageContent } from './MessageContent';
import { MessageActions } from './MessageActions';
import { useSettingsStore } from '@/stores/settingsStore';
import type { LiveArtifactFollowupPayload } from '@/utils/liveArtifactFollowup';

interface MessageProps {
  message: ChatMessage;
  sessionTitle: string;
  prevMessage?: ChatMessage;
  messageIndex: number;
  onEditMessage: (messageId: string, mode: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  onImageClick: (file: UploadedFile) => void; // Renamed to onFileClick in logic, kept name for props compat
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  onLiveArtifactFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
  showThoughts: boolean;
  onGenerateLiveArtifacts: (messageId: string, text: string) => void;
  onContinueGeneration: (messageId: string) => void;
  onForkMessage: (messageId: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onOpenSidePanel: (content: SideViewContent) => void;
  onConfigureFile?: (file: UploadedFile, messageId: string) => void;
  isGemini3?: boolean;
}

export const Message: React.FC<MessageProps> = React.memo((props) => {
  const { message, prevMessage } = props;
  const appSettings = useSettingsStore((state) => state.appSettings);
  const themeId = useSettingsStore((state) => state.currentTheme.id);

  const isGrouped = !!(
    prevMessage &&
    prevMessage.role === message.role &&
    !prevMessage.isLoading &&
    !message.isLoading &&
    new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60 * 1000
  );

  const isModelThinkingOrHasThoughts =
    message.role === 'model' && (message.isLoading || (message.thoughts && props.showThoughts));

  // User messages align right, model messages align left (default)
  const messageContainerClasses = `flex items-start gap-2 sm:gap-4 group ${isGrouped ? 'mt-1.5' : 'mt-6'} ${message.role === 'user' ? 'justify-end' : 'justify-start'}`;

  // Width constraints
  // Mobile: User messages capped at 80% for better visual separation. Model messages use available space (minus actions gap).
  const widthConstraints =
    message.role === 'user'
      ? 'max-w-[80%] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl'
      : 'max-w-[calc(100%-2.5rem)] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl';

  let bubbleClasses = `flex flex-col min-w-0 transition-all duration-200 ${widthConstraints} message-content-container `;

  if (message.role === 'user') {
    // User Message: Bubble style
    bubbleClasses += 'w-fit px-4 py-3 sm:px-5 sm:py-4 shadow-sm ';
    bubbleClasses +=
      'bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-2xl rounded-tr-sm border border-transparent';
  } else if (message.role === 'model') {
    // Model Message: No bubble style
    // Removed padding (px-4 py-3), background, shadow, border, rounded corners
    // Changed to py-0 to further align text top with avatar icon center/top
    bubbleClasses += `w-full py-0 text-[var(--theme-text-primary)] ${isModelThinkingOrHasThoughts ? 'sm:min-w-[320px]' : ''}`;
  } else {
    // Error Message: Bubble style (Red)
    bubbleClasses += 'w-fit px-4 py-3 shadow-sm ';
    bubbleClasses +=
      'bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-2xl border border-transparent';
  }

  return (
    <div className="relative" data-message-id={message.id} data-message-role={message.role}>
      <div className={`${messageContainerClasses}`}>
        {message.role !== 'user' && (
          <MessageActions
            message={message}
            sessionTitle={props.sessionTitle}
            messageIndex={props.messageIndex}
            isGrouped={isGrouped}
            onEditMessage={props.onEditMessage}
            onDeleteMessage={props.onDeleteMessage}
            onRetryMessage={props.onRetryMessage}
            onGenerateLiveArtifacts={props.onGenerateLiveArtifacts}
            onContinueGeneration={props.onContinueGeneration}
            onForkMessage={props.onForkMessage}
            themeId={themeId}
          />
        )}
        <div className={`${bubbleClasses}`}>
          <MessageContent
            message={message}
            onImageClick={props.onImageClick}
            onOpenHtmlPreview={props.onOpenHtmlPreview}
            onLiveArtifactFollowUp={props.onLiveArtifactFollowUp}
            showThoughts={props.showThoughts}
            baseFontSize={appSettings.baseFontSize}
            expandCodeBlocksByDefault={appSettings.expandCodeBlocksByDefault}
            isMermaidRenderingEnabled={appSettings.isMermaidRenderingEnabled}
            isGraphvizRenderingEnabled={appSettings.isGraphvizRenderingEnabled ?? true}
            onSuggestionClick={props.onSuggestionClick}
            appSettings={appSettings}
            themeId={themeId}
            onOpenSidePanel={props.onOpenSidePanel}
            onConfigureFile={props.onConfigureFile}
            isGemini3={props.isGemini3}
          />
        </div>
        {message.role === 'user' && (
          <MessageActions
            message={message}
            sessionTitle={props.sessionTitle}
            messageIndex={props.messageIndex}
            isGrouped={isGrouped}
            onEditMessage={props.onEditMessage}
            onDeleteMessage={props.onDeleteMessage}
            onRetryMessage={props.onRetryMessage}
            onGenerateLiveArtifacts={props.onGenerateLiveArtifacts}
            onContinueGeneration={props.onContinueGeneration}
            onForkMessage={props.onForkMessage}
            themeId={themeId}
          />
        )}
      </div>
    </div>
  );
});
