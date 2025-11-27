
import React, { useEffect, useMemo, useRef } from 'react';
import { Loader2, ChevronDown, Sparkles } from 'lucide-react';

import { ChatMessage, UploadedFile, AppSettings } from '../../types';
import { FileDisplay } from './FileDisplay';
import { translations } from '../../utils/appUtils';
import { GroundedResponse } from './GroundedResponse';
import { MarkdownRenderer } from './MarkdownRenderer';
import { GoogleSpinner } from '../icons/GoogleSpinner';
import { PerformanceMetrics } from './PerformanceMetrics';
import { ThinkingTimer } from './ThinkingTimer';
import { AudioPlayer } from '../shared/AudioPlayer';

interface MessageContentProps {
    message: ChatMessage;
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    showThoughts: boolean;
    baseFontSize: number;
    expandCodeBlocksByDefault: boolean;
    isMermaidRenderingEnabled: boolean;
    isGraphvizRenderingEnabled: boolean;
    onSuggestionClick?: (suggestion: string) => void;
    t: (key: keyof typeof translations) => string;
    appSettings: AppSettings;
    themeId: string;
}

export const MessageContent: React.FC<MessageContentProps> = React.memo(({ message, onImageClick, onOpenHtmlPreview, showThoughts, baseFontSize, expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, t, appSettings, themeId }) => {
    const { content, files, isLoading, thoughts, generationStartTime, audioSrc, groundingMetadata, urlContextMetadata, suggestions, isGeneratingSuggestions } = message;
    
    const showPrimaryThinkingIndicator = isLoading && !content && !audioSrc && (!showThoughts || !thoughts);
    const areThoughtsVisible = message.role === 'model' && thoughts && showThoughts;
    const isQuadImageView = files && files.length === 4 && files.every(f => f.name.startsWith('generated-image-') || f.name.startsWith('edited-image-'));

    const lastThought = useMemo(() => {
        if (!thoughts) return null;

        const lines = thoughts.trim().split('\n');
        let lastHeadingIndex = -1;
        let lastHeading = '';

        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            // Check for ## or ### headings
            if (line.startsWith('## ') || line.startsWith('### ')) {
                lastHeadingIndex = i;
                lastHeading = line.replace(/^[#]+\s*/, '').trim();
                break;
            }
            // Check for lines that are entirely bolded (e.g., **Title**)
            if ((line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) || 
                (line.startsWith('__') && line.endsWith('__') && !line.slice(2, -2).includes('__'))) {
                lastHeadingIndex = i;
                // Remove the bold markers from the start and end
                lastHeading = line.substring(2, line.length - 2).trim();
                break;
            }
        }

        if (lastHeadingIndex === -1) {
             const content = lines.slice(-5).join('\n').trim();
             return { title: 'Latest thought', content, isFallback: true };
        }
        
        const contentLines = lines.slice(lastHeadingIndex + 1);
        const content = contentLines.filter(l => l.trim() !== '').join('\n').trim();

        return { title: lastHeading, content, isFallback: false };
    }, [thoughts]);
    
    const prevIsLoadingRef = useRef(isLoading);

    useEffect(() => {
        if (prevIsLoadingRef.current && !isLoading) {
            if (appSettings.autoFullscreenHtml && message.role === 'model' && message.content) {
                const regex = /```html\s*([\s\S]*?)\s*```/m;
                const match = message.content.match(regex);
                if (match && match[1]) {
                    const htmlContent = match[1].trim();
                    setTimeout(() => {
                        onOpenHtmlPreview(htmlContent, { initialTrueFullscreen: false });
                    }, 100);
                }
            }
        }
        prevIsLoadingRef.current = isLoading;
    }, [isLoading, appSettings.autoFullscreenHtml, message.content, message.role, onOpenHtmlPreview]);


    return (
        <>
            {files && files.length > 0 && (
                isQuadImageView ? (
                    <div className={`grid grid-cols-2 gap-2 ${content || audioSrc ? 'mb-1.5 sm:mb-2' : ''}`}>
                        {files.map((file) => <FileDisplay key={file.id} file={file} onFileClick={onImageClick} isFromMessageList={true} isGridView={true} />)}
                    </div>
                ) : (
                    <div className={`space-y-2 ${content || audioSrc ? 'mb-1.5 sm:mb-2' : ''}`}>
                        {files.map((file) => <FileDisplay key={file.id} file={file} onFileClick={onImageClick} isFromMessageList={true} />)}
                    </div>
                )
            )}
            
            {areThoughtsVisible && (
                <div className="mb-2 mt-1">
                    <details className="group rounded-lg bg-[var(--theme-bg-tertiary)]/20 overflow-hidden transition-all duration-200 open:bg-[var(--theme-bg-tertiary)]/30 open:shadow-sm">
                        <summary className="list-none flex select-none items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]/40 focus:outline-none">
                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                {/* Icon Area */}
                                {isLoading && (
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-300 bg-[var(--theme-bg-accent)]/10`}>
                                        <GoogleSpinner size={20} />
                                    </div>
                                )}

                                {/* Text Area */}
                                <div className="flex flex-col min-w-0 justify-center">
                                    {isLoading ? (
                                        <>
                                            <span className="text-base font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] truncate opacity-90">
                                                {lastThought && !lastThought.isFallback ? lastThought.title : t('thinking_text')}
                                            </span>
                                            <span className="text-xs text-[var(--theme-text-tertiary)] truncate font-mono mt-0.5">
                                                {message.thinkingTimeMs !== undefined ? (
                                                    t('thinking_took_time').replace('{seconds}', Math.round(message.thinkingTimeMs / 1000).toString())
                                                ) : (
                                                    message.generationStartTime ? <ThinkingTimer startTime={message.generationStartTime} t={t} /> : 'Processing...'
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-base text-[var(--theme-text-secondary)] font-medium truncate opacity-90">
                                            {message.thinkingTimeMs !== undefined 
                                                ? t('thinking_took_time').replace('{seconds}', Math.round(message.thinkingTimeMs / 1000).toString()) 
                                                : 'Thought Process'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Chevron */}
                            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full hover:bg-[var(--theme-bg-input)] transition-colors">
                                <ChevronDown size={14} className="text-[var(--theme-text-tertiary)] transition-transform duration-300 group-open:rotate-180" strokeWidth={2}/>
                            </div>
                        </summary>

                        {/* Expanded Content */}
                        <div className="px-3 pb-3 pt-2 border-t border-[var(--theme-border-secondary)]/50 animate-in fade-in slide-in-from-top-2 duration-300 text-xs">
                            {isLoading && lastThought && message.thinkingTimeMs === undefined && (
                                <div className="mb-2 p-2 rounded-md bg-[var(--theme-bg-input)]/50 border border-[var(--theme-border-secondary)]/50 flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--theme-text-success)] text-[var(--theme-text-success)] animate-pulse flex-shrink-0 shadow-[0_0_8px_currentColor]" />
                                    <div className="min-w-0">
                                        <span className="block text-xs font-semibold text-[var(--theme-text-primary)] mb-0.5">{lastThought.title}</span>
                                        <span className="block text-[11px] text-[var(--theme-text-tertiary)] line-clamp-2 leading-normal">{lastThought.content}</span>
                                    </div>
                                </div>
                            )}

                            <div className="prose prose-sm max-w-none dark:prose-invert text-[var(--theme-text-secondary)] leading-relaxed markdown-body thought-process-content opacity-90">
                                <MarkdownRenderer
                                    content={thoughts}
                                    isLoading={isLoading}
                                    onImageClick={onImageClick}
                                    onOpenHtmlPreview={onOpenHtmlPreview}
                                    expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                                    isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                                    isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                                    allowHtml={true}
                                    t={t}
                                    themeId={themeId}
                                />
                            </div>
                        </div>
                    </details>
                </div>
            )}

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
              />
            ) : content && (
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
                    />
                </div>
            )}
            
            {audioSrc && (
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <AudioPlayer src={audioSrc} autoPlay={true} />
                </div>
            )}
            
            {(message.role === 'model' || (message.role === 'error' && generationStartTime)) && (
                <PerformanceMetrics message={message} t={t} />
            )}

            {(suggestions && suggestions.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => onSuggestionClick && onSuggestionClick(suggestion)}
                            className="
                                group relative
                                text-xs sm:text-sm font-medium
                                px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl
                                border border-[var(--theme-border-secondary)]
                                bg-[var(--theme-bg-tertiary)]/20 
                                hover:bg-[var(--theme-bg-tertiary)]
                                hover:border-[var(--theme-border-focus)]
                                text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-link)]
                                transition-all duration-200 ease-out
                                text-left shadow-sm hover:shadow-md
                                active:scale-95
                            "
                        >
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={12} className="text-[var(--theme-text-tertiary)] group-hover:text-[var(--theme-text-link)] opacity-50 group-hover:opacity-100 transition-opacity" />
                                <span className="line-clamp-2">{suggestion}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            { isGeneratingSuggestions && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] animate-pulse opacity-70 px-1">
                    <Loader2 size={12} className="animate-spin" strokeWidth={1.5} />
                    <span>Generating suggestions...</span>
                </div>
            )}
        </>
    );
});
