
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ChevronDown, Languages } from 'lucide-react';

import { ChatMessage, UploadedFile, AppSettings, SideViewContent } from '../../types';
import { FileDisplay } from './FileDisplay';
import { translations, parseThoughtProcess, getKeyForRequest, formatDuration } from '../../utils/appUtils';
import { GroundedResponse } from './GroundedResponse';
import { MarkdownRenderer } from './MarkdownRenderer';
import { GoogleSpinner } from '../icons/GoogleSpinner';
import { PerformanceMetrics } from './PerformanceMetrics';
import { ThinkingTimer } from './ThinkingTimer';
import { AudioPlayer } from '../shared/AudioPlayer';
import { geminiServiceInstance } from '../../services/geminiService';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';

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
    onOpenSidePanel: (content: SideViewContent) => void;
    onConfigureFile?: (file: UploadedFile, messageId: string) => void;
    isGemini3?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = React.memo(({ message, onImageClick, onOpenHtmlPreview, showThoughts, baseFontSize, expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, t, appSettings, themeId, onOpenSidePanel, onConfigureFile, isGemini3 }) => {
    const { content, files, isLoading, thoughts, generationStartTime, audioSrc, groundingMetadata, urlContextMetadata, suggestions, isGeneratingSuggestions } = message;
    
    const showPrimaryThinkingIndicator = isLoading && !content && !audioSrc && (!showThoughts || !thoughts);
    const areThoughtsVisible = message.role === 'model' && thoughts && showThoughts;
    const isQuadImageView = files && files.length === 4 && files.every(f => f.name.startsWith('generated-image-') || f.name.startsWith('edited-image-'));
    const hasFiles = files && files.length > 0;

    const lastThought = useMemo(() => parseThoughtProcess(thoughts), [thoughts]);
    
    const prevIsLoadingRef = useRef(isLoading);

    // Thought Translation State
    const [translatedThoughts, setTranslatedThoughts] = useState<string | null>(null);
    const [isShowingTranslation, setIsShowingTranslation] = useState(false);
    const [isTranslatingThoughts, setIsTranslatingThoughts] = useState(false);

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

    const handleTranslateThoughts = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent toggling details
        
        if (isShowingTranslation) {
            setIsShowingTranslation(false);
            return;
        }

        if (translatedThoughts) {
            setIsShowingTranslation(true);
            return;
        }

        if (!thoughts || isTranslatingThoughts) return;

        setIsTranslatingThoughts(true);
        try {
            // Use appSettings + default chat settings as context for key retrieval if needed
            // Ideally we should use the active session settings, but Message component doesn't receive it directly.
            // Using appSettings is a reasonable fallback for tool usage like translation.
            const tempSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
            const keyResult = getKeyForRequest(appSettings, tempSettings, { skipIncrement: true });
            if ('error' in keyResult) {
                console.error("API Key error for translation:", keyResult.error);
                return;
            }

            const result = await geminiServiceInstance.translateText(keyResult.key, thoughts, 'Chinese');
            setTranslatedThoughts(result);
            setIsShowingTranslation(true);
        } catch (error) {
            console.error("Failed to translate thoughts:", error);
        } finally {
            setIsTranslatingThoughts(false);
        }
    };

    return (
        <>
            {hasFiles && (
                isQuadImageView ? (
                    <div className={`grid grid-cols-2 gap-2 ${content || audioSrc ? 'mb-1.5 sm:mb-2' : ''}`}>
                        {files.map((file) => (
                            <FileDisplay 
                                key={file.id} 
                                file={file} 
                                onFileClick={onImageClick} 
                                isFromMessageList={true} 
                                isGridView={true} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className={`space-y-2 ${content || audioSrc ? 'mb-1.5 sm:mb-2' : ''}`}>
                        {files.map((file) => (
                            <FileDisplay 
                                key={file.id} 
                                file={file} 
                                onFileClick={onImageClick} 
                                isFromMessageList={true}
                                onConfigure={onConfigureFile ? () => onConfigureFile(file, message.id) : undefined}
                                isGemini3={isGemini3}
                            />
                        ))}
                    </div>
                )
            )}
            
            {areThoughtsVisible && (
                <div className={`mb-2 ${hasFiles ? 'mt-1' : '-mt-2'}`}>
                    <details className="group rounded-xl bg-[var(--theme-bg-tertiary)]/20 overflow-hidden transition-all duration-200 open:bg-[var(--theme-bg-tertiary)]/30 open:shadow-sm">
                        <summary className="list-none flex select-none items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]/40 focus:outline-none">
                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                {/* Icon Area */}
                                {isLoading && (
                                    <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-colors duration-300 bg-[var(--theme-bg-accent)]/10`}>
                                        <GoogleSpinner size={20} />
                                    </div>
                                )}

                                {/* Text Area */}
                                <div className="flex flex-col min-w-0 justify-center min-h-[1.75rem] sm:min-h-[2rem]">
                                    {isLoading ? (
                                        <>
                                            <span className="text-base font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] truncate opacity-90">
                                                {lastThought && !lastThought.isFallback ? lastThought.title : t('thinking_text')}
                                            </span>
                                            <span className="text-sm text-[var(--theme-text-tertiary)] truncate font-mono mt-0.5">
                                                {message.thinkingTimeMs !== undefined ? (
                                                    t('thinking_took_time').replace('{duration}', formatDuration(Math.round(message.thinkingTimeMs / 1000)))
                                                ) : (
                                                    message.generationStartTime ? <ThinkingTimer startTime={message.generationStartTime} t={t} /> : 'Processing...'
                                                )}
                                                {message.firstTokenTimeMs !== undefined && (
                                                    <span className="ml-1 opacity-75">
                                                        ({t('metrics_ttft')}: {(message.firstTokenTimeMs / 1000).toFixed(2)}s)
                                                    </span>
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <div className="flex items-baseline gap-2 min-w-0">
                                            <span className="text-base text-[var(--theme-text-secondary)] font-medium truncate opacity-90">
                                                {message.thinkingTimeMs !== undefined 
                                                    ? t('thinking_took_time').replace('{duration}', formatDuration(Math.round(message.thinkingTimeMs / 1000))) 
                                                    : 'Thought Process'}
                                            </span>
                                            {message.firstTokenTimeMs !== undefined && (
                                                <span className="text-xs text-[var(--theme-text-tertiary)] truncate font-mono flex-shrink-0">
                                                    ({t('metrics_ttft')}: {(message.firstTokenTimeMs / 1000).toFixed(2)}s)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Chevron */}
                            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full hover:bg-[var(--theme-bg-input)] transition-colors">
                                <ChevronDown size={14} className="text-[var(--theme-text-tertiary)] transition-transform duration-300 group-open:rotate-180" strokeWidth={2}/>
                            </div>
                        </summary>

                        {/* Expanded Content */}
                        <div className="px-3 pb-3 pt-2 border-t border-[var(--theme-border-secondary)]/50 animate-in fade-in slide-in-from-top-2 duration-300 text-xs relative group/thoughts">
                            {/* Translate Button */}
                            <button
                                onClick={handleTranslateThoughts}
                                className={`
                                    absolute top-2 right-2 p-1.5 rounded-md
                                    bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)]
                                    text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-primary)]
                                    shadow-sm backdrop-blur-md z-10 transition-all duration-200
                                    opacity-0 group-hover/thoughts:opacity-100 focus:opacity-100
                                    ${isShowingTranslation ? 'text-[var(--theme-text-link)] border-[var(--theme-border-focus)]' : ''}
                                `}
                                title={isShowingTranslation ? "Show Original" : "Translate to Chinese"}
                                aria-label={isShowingTranslation ? "Show Original" : "Translate to Chinese"}
                            >
                                {isTranslatingThoughts ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : isShowingTranslation ? (
                                    <Languages size={12} strokeWidth={2.5} />
                                ) : (
                                    <Languages size={12} strokeWidth={1.5} />
                                )}
                            </button>

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
                                    content={isShowingTranslation && translatedThoughts ? translatedThoughts : thoughts}
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
                onOpenSidePanel={onOpenSidePanel}
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
                        onOpenSidePanel={onOpenSidePanel}
                    />
                </div>
            )}
            
            {audioSrc && (
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <AudioPlayer src={audioSrc} autoPlay={true} />
                </div>
            )}
            
            {(message.role === 'model' || (message.role === 'error' && generationStartTime)) && (
                <PerformanceMetrics 
                    message={message} 
                    t={t} 
                    hideTimer={isLoading}
                />
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
                            <span className="line-clamp-2">{suggestion}</span>
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
