

import React, { useEffect, useRef } from 'react';
import { ChatMessage, UploadedFile, AppSettings, SideViewContent } from '../../../types';
import { translations } from '../../../utils/appUtils';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { GroundedResponse } from '../GroundedResponse';
import { GoogleSpinner } from '../../icons/GoogleSpinner';
import { isLikelyHtml } from '../../../utils/codeUtils';

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
    
    // Auto Fullscreen HTML Logic
    const prevIsLoadingRef = useRef(isLoading);
    useEffect(() => {
        if (prevIsLoadingRef.current && !isLoading) {
            if (appSettings.autoFullscreenHtml && message.role === 'model' && message.content) {
                const regex = /```html\s*([\s\S]*?)\s*```/m;
                const match = message.content.match(regex);
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
        prevIsLoadingRef.current = isLoading;
    }, [isLoading, appSettings.autoFullscreenHtml, message.content, message.role, onOpenHtmlPreview]);

    const showPrimaryThinkingIndicator = isLoading && !content && !audioSrc && (!showThoughts || !thoughts);

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

            {(content && (groundingMetadata || urlContextMetadata)) ? (
              <GroundedResponse 
                text={content} 
                metadata={groundingMetadata} 
                urlContextMetadata={urlContextMetadata}
                isLoading={isLoading} 
                onOpenHtmlPreview={onOpenHtmlPreview} 
                expandCodeBlocksByDefault={expandCodeBlocksByDefault} 
                onImageClick={onImageClick} 
                isMermaidRenderingEnabled={isMermaidRenderingEnabled} 
                isGraphvizRenderingEnabled={isGraphvizRenderingEnabled} 
                t={t} 
                themeId={themeId} 
                onOpenSidePanel={onOpenSidePanel}
              />
            ) : content ? (
                <div className="markdown-body" style={{ fontSize: `${baseFontSize}px` }}> 
                    <MarkdownRenderer
                        content={content}
                        isLoading={isLoading}
                        onImageClick={onImageClick}
                        onOpenHtmlPreview={onOpenHtmlPreview}
                        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                        allowHtml={true}
                        t={t}
                        themeId={themeId}
                        onOpenSidePanel={onOpenSidePanel}
                        hideThinkingInContext={appSettings.hideThinkingInContext}
                    />
                </div>
            ) : null}
        </>
    );
};