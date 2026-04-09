

import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { ChatMessage, UploadedFile, AppSettings, SideViewContent } from '../../../types';
import { translations } from '../../../utils/appUtils';
import { LazyMarkdownRenderer } from '../LazyMarkdownRenderer';
import { GoogleSpinner } from '../../icons/GoogleSpinner';
import { isLikelyHtml } from '../../../utils/codeUtils';
import { useSmoothStreaming } from '../../../hooks/ui/useSmoothStreaming';
import { useMessageStream } from '../../../hooks/ui/useMessageStream';

const GroundedResponse = lazy(async () => {
    const module = await import('../GroundedResponse');
    return { default: module.GroundedResponse };
});

interface MessageTextProps {
    message: ChatMessage;
    showThoughts: boolean;
    appSettings: AppSettings;
    t: (key: keyof typeof translations) => string;
    themeId: string;
    baseFontSize: number;
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    expandCodeBlocksByDefault: boolean;
    isMermaidRenderingEnabled: boolean;
    isGraphvizRenderingEnabled: boolean;
    onOpenSidePanel: (content: SideViewContent) => void;
}

export const MessageText: React.FC<MessageTextProps> = ({
    message,
    showThoughts,
    appSettings,
    t,
    themeId,
    baseFontSize,
    onImageClick,
    onOpenHtmlPreview,
    expandCodeBlocksByDefault,
    isMermaidRenderingEnabled,
    isGraphvizRenderingEnabled,
    onOpenSidePanel
}) => {
    const { content, isLoading, audioSrc, groundingMetadata, urlContextMetadata, thoughts } = message;
    const isMessageLoading = !!isLoading;
    const shouldAutoFullscreenHtml = !!appSettings.autoFullscreenHtml;
    
    // Subscribe to live stream updates if loading
    const { streamContent, streamThoughts } = useMessageStream(message.id, isMessageLoading && message.role === 'model');
    
    // Use streamed content if available, otherwise fall back to persisted content
    const effectiveContent = streamContent || content;
    const effectiveThoughts = streamThoughts || thoughts;

    // Apply smooth streaming effect only when loading and for model messages
    const shouldSmooth = isMessageLoading && message.role === 'model';
    const displayedContent = useSmoothStreaming(effectiveContent, shouldSmooth);

    // Auto Fullscreen HTML Logic
    const prevIsLoadingRef = useRef(isMessageLoading);
    useEffect(() => {
        if (prevIsLoadingRef.current && !isMessageLoading) {
            if (shouldAutoFullscreenHtml && message.role === 'model' && effectiveContent) {
                const regex = /```html\s*([\s\S]*?)\s*```/m;
                const match = effectiveContent.match(regex);
                if (match && match[1]) {
                    const htmlContent = match[1].trim();
                    // Validate that it looks like a full page before auto-opening
                    if (isLikelyHtml(htmlContent)) {
                        setTimeout(() => {
                            onOpenHtmlPreview(htmlContent, { initialTrueFullscreen: false });
                        }, 100);
                    }
                }
            }
        }
        prevIsLoadingRef.current = isMessageLoading;
    }, [isMessageLoading, shouldAutoFullscreenHtml, effectiveContent, message.role, onOpenHtmlPreview]);

    // Only show the primary thinking indicator (spinner) if:
    // 1. It is loading
    // 2. There is no content yet
    // 3. There is no audio yet
    // 4. AND either thoughts are disabled OR there are no thoughts (even streamed ones) yet.
    // This prevents showing the spinner here when the MessageThoughts component is already showing it.
    const showPrimaryThinkingIndicator = isMessageLoading && !effectiveContent && !audioSrc && (!showThoughts || !effectiveThoughts);

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

            {(effectiveContent && (groundingMetadata || urlContextMetadata)) ? (
              <Suspense fallback={<div className="whitespace-pre-wrap break-words">{displayedContent}</div>}>
                <GroundedResponse 
                  text={displayedContent} // Use smoothed text
                  metadata={groundingMetadata} 
                  urlContextMetadata={urlContextMetadata}
                  isLoading={isMessageLoading} 
                  onOpenHtmlPreview={onOpenHtmlPreview} 
                  expandCodeBlocksByDefault={expandCodeBlocksByDefault} 
                  onImageClick={onImageClick} 
                  isMermaidRenderingEnabled={isMermaidRenderingEnabled} 
                  isGraphvizRenderingEnabled={isGraphvizRenderingEnabled} 
                  t={t} 
                  themeId={themeId} 
                  onOpenSidePanel={onOpenSidePanel}
                  files={message.files}
                />
              </Suspense>
            ) : effectiveContent ? (
                <div className={`markdown-body ${isMessageLoading ? 'is-loading' : ''}`} style={{ fontSize: `${baseFontSize}px` }}> 
                    <LazyMarkdownRenderer
                        content={displayedContent} // Use smoothed text
                        isLoading={isMessageLoading}
                        onImageClick={onImageClick}
                        onOpenHtmlPreview={onOpenHtmlPreview}
                        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                        allowHtml={true}
                        t={t}
                        themeId={themeId}
                        onOpenSidePanel={onOpenSidePanel}
                        hideThinkingInContext={!!appSettings.hideThinkingInContext}
                        files={message.files}
                        fallback={<div className="whitespace-pre-wrap break-words">{displayedContent}</div>}
                    />
                </div>
            ) : null}
        </>
    );
};
