import React, { useEffect, useMemo, useRef } from 'react';
import { ChatMessage, UploadedFile, AppSettings, SideViewContent } from '../../../types';
import { useI18n } from '../../../contexts/I18nContext';
import { LazyMarkdownRenderer } from '../LazyMarkdownRenderer';
import { GroundedResponse } from '../GroundedResponse';
import { GoogleSpinner } from '../../icons/GoogleSpinner';
import { extractPreviewableCodeBlock, normalizePreviewableMarkdownContent } from '../../../utils/codeUtils';
import { useSmoothStreaming } from '../../../hooks/ui/useSmoothStreaming';
import { useMessageStream } from '../../../hooks/ui/useMessageStream';
import { extractRawThinkingBlocks } from '../../../utils/chat/reasoning';
import type { LiveArtifactFollowupPayload } from '../../../utils/liveArtifactFollowup';

interface MessageTextProps {
  message: ChatMessage;
  showThoughts: boolean;
  appSettings: AppSettings;
  themeId: string;
  baseFontSize: number;
  onImageClick: (file: UploadedFile) => void;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  onLiveArtifactFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  onOpenSidePanel: (content: SideViewContent) => void;
}

export const MessageText: React.FC<MessageTextProps> = ({
  message,
  showThoughts,
  appSettings,
  themeId,
  baseFontSize,
  onImageClick,
  onOpenHtmlPreview,
  onLiveArtifactFollowUp,
  expandCodeBlocksByDefault,
  isMermaidRenderingEnabled,
  isGraphvizRenderingEnabled,
  onOpenSidePanel,
}) => {
  const { t } = useI18n();
  const { content, audioSrc, groundingMetadata, urlContextMetadata, thoughts } = message;
  const isLoading = message.isLoading ?? false;

  // Subscribe to live stream updates if loading
  const { streamContent, streamThoughts } = useMessageStream(message.id, isLoading && message.role === 'model');

  // Use streamed content if available, otherwise fall back to persisted content
  const rawThinkingExtraction = extractRawThinkingBlocks(streamContent ? `${content || ''}${streamContent}` : content);
  const effectiveContent = rawThinkingExtraction.content;
  const effectiveThoughts = [thoughts, streamThoughts, rawThinkingExtraction.thoughts].filter(Boolean).join('\n\n');

  // Apply smooth streaming effect only when loading and for model messages
  const shouldSmooth = isLoading && message.role === 'model';
  const displayedContent = useSmoothStreaming(effectiveContent, shouldSmooth);
  const markdownContent = useMemo(() => normalizePreviewableMarkdownContent(displayedContent), [displayedContent]);

  // Auto Fullscreen HTML Logic
  const prevIsLoadingRef = useRef(isLoading);
  useEffect(() => {
    let previewTimeout: number | null = null;

    if (prevIsLoadingRef.current && !isLoading) {
      if (appSettings.autoFullscreenHtml && message.role === 'model' && effectiveContent) {
        const previewableBlock = extractPreviewableCodeBlock(effectiveContent);
        if (previewableBlock) {
          previewTimeout = window.setTimeout(() => {
            onOpenHtmlPreview(previewableBlock.content, { initialTrueFullscreen: false });
          }, 100);
        }
      }
    }
    prevIsLoadingRef.current = isLoading;

    return () => {
      if (previewTimeout !== null) {
        clearTimeout(previewTimeout);
      }
    };
  }, [isLoading, appSettings.autoFullscreenHtml, effectiveContent, message.role, onOpenHtmlPreview]);

  // Only show the primary thinking indicator (spinner) if:
  // 1. It is loading
  // 2. There is no content yet
  // 3. There is no audio yet
  // 4. AND either thoughts are disabled OR there are no thoughts (even streamed ones) yet.
  // This prevents showing the spinner here when the MessageThoughts component is already showing it.
  const showPrimaryThinkingIndicator =
    isLoading && !effectiveContent && !audioSrc && (!showThoughts || !effectiveThoughts);

  return (
    <>
      {showPrimaryThinkingIndicator && (
        <div className="flex items-center text-sm text-[var(--theme-bg-model-message-text)] py-1 px-1 opacity-80 animate-pulse">
          <div className="mr-2.5 flex-shrink-0">
            <GoogleSpinner size={14} />
          </div>
          <span className="font-medium">{t('thinking_text')}</span>
        </div>
      )}

      {groundingMetadata || urlContextMetadata ? (
        <GroundedResponse
          messageId={message.id}
          text={displayedContent || ''} // Use smoothed text when available
          metadata={groundingMetadata}
          urlContextMetadata={urlContextMetadata}
          isLoading={isLoading}
          onOpenHtmlPreview={onOpenHtmlPreview}
          expandCodeBlocksByDefault={expandCodeBlocksByDefault}
          onImageClick={onImageClick}
          onLiveArtifactFollowUp={onLiveArtifactFollowUp}
          isMermaidRenderingEnabled={isMermaidRenderingEnabled}
          isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
          themeId={themeId}
          onOpenSidePanel={onOpenSidePanel}
          files={message.files}
        />
      ) : effectiveContent ? (
        <div className={`markdown-body ${isLoading ? 'is-loading' : ''}`} style={{ fontSize: `${baseFontSize}px` }}>
          <LazyMarkdownRenderer
            messageId={message.id}
            content={markdownContent}
            isLoading={isLoading}
            onImageClick={onImageClick}
            onOpenHtmlPreview={onOpenHtmlPreview}
            onLiveArtifactFollowUp={onLiveArtifactFollowUp}
            expandCodeBlocksByDefault={expandCodeBlocksByDefault}
            isMermaidRenderingEnabled={isMermaidRenderingEnabled}
            isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
            allowHtml={true}
            themeId={themeId}
            onOpenSidePanel={onOpenSidePanel}
            hideThinkingInContext={appSettings.hideThinkingInContext}
            files={message.files}
          />
        </div>
      ) : null}
    </>
  );
};
