
import React, { useMemo, useState } from 'react';
import { ChatMessage, AppSettings, SideViewContent, UploadedFile } from '../../../types';
import { translations, parseThoughtProcess, getKeyForRequest } from '../../../utils/appUtils';
import { geminiServiceInstance } from '../../../services/geminiService';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { ThinkingHeader } from './thoughts/ThinkingHeader';
import { ThinkingActions } from './thoughts/ThinkingActions';
import { ThoughtContent } from './thoughts/ThoughtContent';

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
    
    // UI State
    const [isExpanded, setIsExpanded] = useState(false);
    const [translatedThoughts, setTranslatedThoughts] = useState<string | null>(null);
    const [isShowingTranslation, setIsShowingTranslation] = useState(false);
    const [isTranslatingThoughts, setIsTranslatingThoughts] = useState(false);

    // Copy Hook
    const { isCopied, copyToClipboard } = useCopyToClipboard(2000);

    const lastThought = useMemo(() => parseThoughtProcess(thoughts), [thoughts]);

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

    const handleCopyThoughts = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const textToCopy = isShowingTranslation && translatedThoughts ? translatedThoughts : thoughts;
        if (textToCopy) {
            copyToClipboard(textToCopy);
        }
    };

    const hasFiles = message.files && message.files.length > 0;

    return (
        <div className={`mb-2 ${hasFiles ? 'mt-1' : '-mt-2'}`}>
            <details 
                className="group rounded-xl bg-[var(--theme-bg-tertiary)]/20 overflow-hidden transition-all duration-200 open:bg-[var(--theme-bg-tertiary)]/30 open:shadow-sm"
                onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
            >
                <summary className="list-none flex select-none items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]/40 focus:outline-none">
                    <ThinkingHeader 
                        isLoading={!!isLoading}
                        lastThought={lastThought}
                        thinkingTimeMs={message.thinkingTimeMs}
                        generationStartTime={message.generationStartTime}
                        firstTokenTimeMs={message.firstTokenTimeMs}
                        t={t}
                    />
                    
                    <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
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
                </summary>

                <ThoughtContent 
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
            </details>
        </div>
    );
};
