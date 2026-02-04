
import React, { useMemo, useState } from 'react';
import { ChatMessage, AppSettings, SideViewContent, UploadedFile } from '../../../types';
import { translations, parseThoughtProcess, getKeyForRequest } from '../../../utils/appUtils';
import { geminiServiceInstance } from '../../../services/geminiService';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { ThinkingHeader } from './thoughts/ThinkingHeader';
import { ThinkingActions } from './thoughts/ThinkingActions';
import { ThoughtContent } from './thoughts/ThoughtContent';
import { useMessageStream } from '../../../hooks/ui/useMessageStream';

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
    const { thoughts, isLoading, role, id: messageId } = message;
    
    // Subscribe to live thoughts if loading to check visibility
    const { streamThoughts } = useMessageStream(messageId, !!isLoading && role === 'model');
    const effectiveThoughts = streamThoughts || thoughts;
    
    const areThoughtsVisible = role === 'model' && effectiveThoughts && showThoughts;
    
    // UI State
    const [isExpanded, setIsExpanded] = useState(false);
    const [translatedThoughts, setTranslatedThoughts] = useState<string | null>(null);
    const [isShowingTranslation, setIsShowingTranslation] = useState(false);
    const [isTranslatingThoughts, setIsTranslatingThoughts] = useState(false);

    // Copy Hook
    const { isCopied, copyToClipboard } = useCopyToClipboard(2000);

    const lastThought = useMemo(() => parseThoughtProcess(effectiveThoughts), [effectiveThoughts]);

    if (!areThoughtsVisible) return null;

    const handleTranslateThoughts = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (isShowingTranslation) {
            setIsShowingTranslation(false);
            return;
        }

        if (translatedThoughts) {
            setIsShowingTranslation(true);
            return;
        }

        if (!effectiveThoughts || isTranslatingThoughts) return;

        setIsTranslatingThoughts(true);
        try {
            const tempSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
            const keyResult = getKeyForRequest(appSettings, tempSettings, { skipIncrement: true });
            if ('error' in keyResult) {
                console.error("API Key error for translation:", keyResult.error);
                return;
            }

            const result = await geminiServiceInstance.translateText(keyResult.key, effectiveThoughts, 'Chinese');
            setTranslatedThoughts(result);
            setIsShowingTranslation(true);
        } catch (error) {
            console.error("Failed to translate thoughts:", error);
        } finally {
            setIsTranslatingThoughts(false);
        }
    };

    const handleCopyThoughts = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const textToCopy = isShowingTranslation && translatedThoughts ? translatedThoughts : effectiveThoughts;
        if (textToCopy) {
            copyToClipboard(textToCopy);
        }
    };

    const hasFiles = message.files && message.files.length > 0;

    return (
        <div className={`mb-2 ${hasFiles ? 'mt-1' : '-mt-2'}`}>
            <div 
                className={`group rounded-xl bg-[var(--theme-bg-tertiary)]/20 overflow-hidden transition-all duration-200 ${isExpanded ? 'bg-[var(--theme-bg-tertiary)]/30 shadow-sm' : ''}`}
            >
                <div 
                    className="flex select-none items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]/40 focus:outline-none"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <ThinkingHeader 
                        isLoading={!!isLoading}
                        lastThought={lastThought}
                        thinkingTimeMs={message.thinkingTimeMs}
                        generationStartTime={message.generationStartTime}
                        firstTokenTimeMs={message.firstTokenTimeMs}
                        t={t}
                        isExpanded={isExpanded}
                    />
                    
                    <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                        {/* Stop propagation to prevent toggling when clicking actions */}
                        <div onClick={(e) => e.stopPropagation()}>
                            <ThinkingActions 
                                isExpanded={isExpanded}
                                isShowingTranslation={isShowingTranslation}
                                isTranslatingThoughts={isTranslatingThoughts}
                                isCopied={isCopied}
                                onTranslate={handleTranslateThoughts}
                                onCopy={handleCopyThoughts}
                                t={t}
                            />
                        </div>
                    </div>
                </div>

                <div className={`thought-process-accordion ${isExpanded ? 'expanded' : ''}`}>
                    <div className="thought-process-inner">
                        <ThoughtContent 
                            messageId={messageId}
                            isLoading={!!isLoading}
                            lastThought={lastThought}
                            thinkingTimeMs={message.thinkingTimeMs}
                            content={isShowingTranslation && translatedThoughts ? translatedThoughts : (thoughts || '')}
                            onImageClick={onImageClick}
                            onOpenHtmlPreview={onOpenHtmlPreview}
                            expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                            isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                            isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                            t={t}
                            themeId={themeId}
                            onOpenSidePanel={onOpenSidePanel}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
