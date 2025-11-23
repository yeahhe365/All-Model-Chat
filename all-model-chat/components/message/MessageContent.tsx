
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, ChevronDown, Sigma, Zap, Brain } from 'lucide-react';

import { ChatMessage, UploadedFile, AppSettings } from '../../types';
import { FileDisplay } from './FileDisplay';
import { translations } from '../../utils/appUtils';
import { GroundedResponse } from './GroundedResponse';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';

const MessageTimer: React.FC<{ startTime?: Date; endTime?: Date; isLoading?: boolean }> = ({ startTime, endTime, isLoading }) => {
  const [elapsedTime, setElapsedTime] = useState<string>('');
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isLoading && startTime instanceof Date) {
      const updateTimer = () => setElapsedTime(`${((new Date().getTime() - startTime.getTime()) / 1000).toFixed(1)}s`);
      updateTimer();
      intervalId = setInterval(updateTimer, 200);
    } else if (!isLoading && startTime instanceof Date && endTime instanceof Date) {
      setElapsedTime(`${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1)}s`);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [startTime, endTime, isLoading]);

  if (!elapsedTime && !(isLoading && startTime)) return null;
  return <span className="text-xs text-[var(--theme-text-tertiary)] font-light tabular-nums pt-0.5 flex items-center">{elapsedTime || "0.0s"}</span>;
};

const TokenDisplay: React.FC<{ message: ChatMessage; t: (key: keyof typeof translations) => string }> = ({ message, t }) => {
  if (message.role !== 'model' || (!message.promptTokens && !message.completionTokens && !message.cumulativeTotalTokens)) return null;
  const parts = [
    typeof message.promptTokens === 'number' && `Input: ${message.promptTokens}`,
    typeof message.completionTokens === 'number' && `Output: ${message.completionTokens}`,
    typeof message.cumulativeTotalTokens === 'number' && `Total: ${message.cumulativeTotalTokens}`,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return <span className="text-xs text-[var(--theme-text-tertiary)] font-light tabular-nums pt-0.5 flex items-center" title="Token Usage"><Sigma size={10} className="mr-1.5 opacity-80" strokeWidth={1.5} />{parts.join(' | ')}<span className="ml-1">{t('tokens_unit')}</span></span>;
};

const TokenRateDisplay: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { completionTokens, generationStartTime, generationEndTime, isLoading } = message;

  if (isLoading || !completionTokens || !generationStartTime || !generationEndTime) {
    return null;
  }
  
  const generationTimeMs = new Date(generationEndTime).getTime() - new Date(generationStartTime).getTime();
  if (generationTimeMs <= 0) {
    return null;
  }

  const generationTimeSeconds = generationTimeMs / 1000;
  const tokensPerSecond = completionTokens / generationTimeSeconds;

  if (tokensPerSecond <= 0) {
      return null;
  }

  return (
    <span className="text-xs text-[var(--theme-text-tertiary)] font-light tabular-nums pt-0.5 flex items-center" title="Tokens per second">
        <Zap size={10} className="mr-1.5 opacity-80 text-yellow-500" strokeWidth={1.5} />
        {tokensPerSecond.toFixed(1)} tokens/s
    </span>
  );
};

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
}

export const MessageContent: React.FC<MessageContentProps> = React.memo(({ message, onImageClick, onOpenHtmlPreview, showThoughts, baseFontSize, expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, t, appSettings }) => {
    const { content, files, isLoading, thoughts, generationStartTime, generationEndTime, audioSrc, groundingMetadata, suggestions, isGeneratingSuggestions } = message;
    
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
        // Trigger condition: message just finished loading
        if (prevIsLoadingRef.current && !isLoading) {
            if (appSettings.autoFullscreenHtml && message.role === 'model' && message.content) {
                const regex = /```html\s*([\s\S]*?)\s*```/m;
                const match = message.content.match(regex);
                if (match && match[1]) {
                    const htmlContent = match[1].trim();
                    // Small delay to ensure the modal doesn't fight with other UI updates
                    setTimeout(() => {
                        onOpenHtmlPreview(htmlContent, { initialTrueFullscreen: true });
                    }, 100);
                }
            }
        }
        // Update the ref for the next render
        prevIsLoadingRef.current = isLoading;
    }, [isLoading, appSettings.autoFullscreenHtml, message.content, message.role, onOpenHtmlPreview]);


    return (
        <>
            {files && files.length > 0 && (
                isQuadImageView ? (
                    <div className={`grid grid-cols-2 gap-2 ${content || audioSrc ? 'mb-1.5 sm:mb-2' : ''}`}>
                        {files.map((file) => <FileDisplay key={file.id} file={file} onImageClick={onImageClick} isFromMessageList={true} isGridView={true} />)}
                    </div>
                ) : (
                    <div className={`space-y-2 ${content || audioSrc ? 'mb-1.5 sm:mb-2' : ''}`}>
                        {files.map((file) => <FileDisplay key={file.id} file={file} onImageClick={onImageClick} isFromMessageList={true} />)}
                    </div>
                )
            )}
            
            {areThoughtsVisible && (
                <div className="mb-2 mt-1">
                    <details className="group rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)]/20 overflow-hidden transition-all duration-200 open:bg-[var(--theme-bg-tertiary)]/30 open:shadow-sm">
                        <summary className="list-none flex select-none items-center justify-between px-3 py-2 cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]/40 focus:outline-none">
                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                {/* Icon Area */}
                                {isLoading && (
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors duration-300 bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-link)]`}>
                                        <Loader2 size={14} className="animate-spin" strokeWidth={2} />
                                    </div>
                                )}

                                {/* Text Area */}
                                <div className="flex flex-col min-w-0 justify-center">
                                    {isLoading ? (
                                        <>
                                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] truncate opacity-90">
                                                {lastThought && !lastThought.isFallback ? lastThought.title : t('thinking_text')}
                                            </span>
                                            <span className="text-[10px] text-[var(--theme-text-tertiary)] truncate font-mono mt-0.5">
                                                {message.thinkingTimeMs !== undefined ? (
                                                    t('thinking_took_time').replace('{seconds}', Math.round(message.thinkingTimeMs / 1000).toString())
                                                ) : (
                                                    message.generationEndTime && message.generationStartTime 
                                                    ? t('thinking_took_time').replace('{seconds}', Math.round((new Date(message.generationEndTime).getTime() - new Date(message.generationStartTime).getTime()) / 1000).toString()) 
                                                    : 'Processing...'
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs text-[var(--theme-text-secondary)] font-medium truncate opacity-90">
                                            {message.thinkingTimeMs !== undefined 
                                                ? t('thinking_took_time').replace('{seconds}', Math.round(message.thinkingTimeMs / 1000).toString()) 
                                                : 'Thought Process'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Chevron */}
                            <div className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-[var(--theme-bg-input)] transition-colors">
                                <ChevronDown size={14} className="text-[var(--theme-text-tertiary)] transition-transform duration-300 group-open:rotate-180" strokeWidth={2}/>
                            </div>
                        </summary>

                        {/* Expanded Content */}
                        <div className="px-3 pb-3 pt-2 border-t border-[var(--theme-border-secondary)]/50 animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* Live preview of current step when loading and open */}
                            {isLoading && lastThought && message.thinkingTimeMs === undefined && (
                                <div className="mb-2 p-2 rounded-md bg-[var(--theme-bg-input)]/50 border border-[var(--theme-border-secondary)]/50 flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--theme-text-link)] animate-pulse flex-shrink-0 shadow-[0_0_8px_currentColor]" />
                                    <div className="min-w-0">
                                        <span className="block text-xs font-semibold text-[var(--theme-text-primary)] mb-0.5">{lastThought.title}</span>
                                        <span className="block text-[11px] text-[var(--theme-text-tertiary)] line-clamp-2 leading-normal">{lastThought.content}</span>
                                    </div>
                                </div>
                            )}

                            <div className="prose prose-sm max-w-none dark:prose-invert text-[var(--theme-text-secondary)] text-sm leading-relaxed markdown-body thought-process-content opacity-90">
                                <MarkdownRenderer
                                    content={thoughts}
                                    isLoading={isLoading}
                                    onImageClick={onImageClick}
                                    onOpenHtmlPreview={onOpenHtmlPreview}
                                    expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                                    isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                                    isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                                    allowHtml={true}
                                />
                            </div>
                        </div>
                    </details>
                </div>
            )}

            {showPrimaryThinkingIndicator && (
                <div className="flex items-center text-sm text-[var(--theme-bg-model-message-text)] py-1 px-1 opacity-80 animate-pulse">
                    <div className="gemini-loader w-3.5 h-3.5 animate-spin mr-2.5 flex-shrink-0" /> 
                    <span className="font-medium">{t('thinking_text')}</span>
                </div>
            )}

            {content && groundingMetadata ? (
              <GroundedResponse text={content} metadata={groundingMetadata} isLoading={isLoading} onOpenHtmlPreview={onOpenHtmlPreview} expandCodeBlocksByDefault={expandCodeBlocksByDefault} onImageClick={onImageClick} isMermaidRenderingEnabled={isMermaidRenderingEnabled} isGraphvizRenderingEnabled={isGraphvizRenderingEnabled} />
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
                    />
                </div>
            )}
            
            {audioSrc && (
                <div className="mt-2">
                    <audio src={audioSrc} controls autoPlay className="w-full h-10" />
                </div>
            )}
            
            {(message.role === 'model' || (message.role === 'error' && generationStartTime)) && (
                <div className="mt-1 sm:mt-1.5 flex justify-end items-center gap-2 sm:gap-3 flex-wrap">
                    <TokenDisplay message={message} t={t} />
                    <TokenRateDisplay message={message} />
                    {(isLoading || (generationStartTime && generationEndTime)) && <MessageTimer startTime={generationStartTime} endTime={generationEndTime} isLoading={isLoading} />}
                </div>
            )}

            {(suggestions && suggestions.length > 0) && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => onSuggestionClick && onSuggestionClick(suggestion)}
                            className="
                                text-xs px-3 py-1.5 rounded-xl
                                border border-[var(--theme-border-secondary)]/50
                                bg-[var(--theme-bg-primary)]/30
                                hover:bg-[var(--theme-bg-tertiary)]
                                text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]
                                transition-colors duration-200
                                text-left
                            "
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
            { isGeneratingSuggestions && (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] animate-pulse opacity-70">
                    <Loader2 size={12} className="animate-spin" strokeWidth={1.5} />
                    <span>Generating suggestions...</span>
                </div>
            )}
        </>
    );
});
