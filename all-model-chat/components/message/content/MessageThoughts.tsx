import React, { useMemo, useState } from 'react';
import { ChevronDown, Languages, Loader2 } from 'lucide-react';
import { ChatMessage, AppSettings, SideViewContent, UploadedFile } from '../../../types';
import { translations, parseThoughtProcess, formatDuration, getKeyForRequest } from '../../../utils/appUtils';
import { GoogleSpinner } from '../../icons/GoogleSpinner';
import { ThinkingTimer } from '../ThinkingTimer';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { geminiServiceInstance } from '../../../services/geminiService';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';

interface MessageThoughtsProps {
    message: ChatMessage;
    showThoughts: boolean;
    t: (key: keyof typeof translations) => string;
    appSettings: AppSettings;
    themeId: string;
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    expandCodeBlocksByDefault: boolean;
    isMermaidRenderingEnabled: boolean;
    isGraphvizRenderingEnabled: boolean;
    onOpenSidePanel: (content: SideViewContent) => void;
}

export const MessageThoughts: React.FC<MessageThoughtsProps> = ({
    message,
    showThoughts,
    t,
    appSettings,
    themeId,
    onImageClick,
    onOpenHtmlPreview,
    expandCodeBlocksByDefault,
    isMermaidRenderingEnabled,
    isGraphvizRenderingEnabled,
    onOpenSidePanel
}) => {
    const { thoughts, isLoading, role } = message;
    const areThoughtsVisible = role === 'model' && thoughts && showThoughts;
    
    // Translation State
    const [translatedThoughts, setTranslatedThoughts] = useState<string | null>(null);
    const [isShowingTranslation, setIsShowingTranslation] = useState(false);
    const [isTranslatingThoughts, setIsTranslatingThoughts] = useState(false);

    const lastThought = useMemo(() => parseThoughtProcess(thoughts), [thoughts]);

    if (!areThoughtsVisible) return null;

    const handleTranslateThoughts = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
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

    const hasFiles = message.files && message.files.length > 0;

    return (
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
                            content={isShowingTranslation && translatedThoughts ? translatedThoughts : (thoughts || '')}
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
    );
};