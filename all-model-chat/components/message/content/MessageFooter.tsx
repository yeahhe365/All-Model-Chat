
import React from 'react';
import { Loader2 } from 'lucide-react';
import { ChatMessage } from '../../../types';
import { translations } from '../../../utils/appUtils';
import { PerformanceMetrics } from '../PerformanceMetrics';
import { AudioPlayer } from '../../shared/AudioPlayer';

interface MessageFooterProps {
    message: ChatMessage;
    t: (key: keyof typeof translations) => string;
    onSuggestionClick?: (suggestion: string) => void;
}

export const MessageFooter: React.FC<MessageFooterProps> = ({ message, t, onSuggestionClick }) => {
    const { audioSrc, audioAutoplay, suggestions, isGeneratingSuggestions, role, generationStartTime } = message;

    return (
        <>
            {audioSrc && (
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <AudioPlayer src={audioSrc} autoPlay={audioAutoplay ?? false} />
                </div>
            )}
            
            {(role === 'model' || (role === 'error' && generationStartTime)) && (
                <PerformanceMetrics 
                    message={message} 
                    t={t} 
                    hideTimer={message.isLoading}
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
            
            {isGeneratingSuggestions && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] animate-pulse opacity-70 px-1">
                    <Loader2 size={12} className="animate-spin" strokeWidth={1.5} />
                    <span>Generating suggestions...</span>
                </div>
            )}
        </>
    );
};
