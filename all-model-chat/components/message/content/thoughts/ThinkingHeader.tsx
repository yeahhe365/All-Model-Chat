
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { GoogleSpinner } from '../../../icons/GoogleSpinner';
import { ThinkingTimer } from '../../ThinkingTimer';
import { formatDuration } from '../../../../utils/appUtils';

interface ThinkingHeaderProps {
    isLoading: boolean;
    lastThought: { title: string; content: string; isFallback: boolean } | null;
    thinkingTimeMs?: number;
    generationStartTime?: Date;
    firstTokenTimeMs?: number;
    t: (key: any, fallback?: string) => string;
}

export const ThinkingHeader: React.FC<ThinkingHeaderProps> = ({
    isLoading,
    lastThought,
    thinkingTimeMs,
    generationStartTime,
    firstTokenTimeMs,
    t
}) => {
    return (
        <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-grow">
            {/* Icon Area */}
            {isLoading && (
                <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-colors duration-300 bg-[var(--theme-bg-accent)]/10`}>
                    <GoogleSpinner size={20} />
                </div>
            )}

            {/* Text Area + Integrated Chevron */}
            <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col min-w-0 justify-center min-h-[1.75rem] sm:min-h-[2rem]">
                    {isLoading ? (
                        <>
                            <span className="text-base font-bold uppercase tracking-wider text-[var(--theme-text-secondary)] truncate opacity-90">
                                {lastThought && !lastThought.isFallback ? lastThought.title : t('thinking_text')}
                            </span>
                            <span className="text-sm text-[var(--theme-text-tertiary)] truncate font-mono mt-0.5">
                                {thinkingTimeMs !== undefined ? (
                                    t('thinking_took_time').replace('{duration}', formatDuration(Math.round(thinkingTimeMs / 1000)))
                                ) : (
                                    generationStartTime ? <ThinkingTimer startTime={generationStartTime} t={t} /> : 'Processing...'
                                )}
                                {firstTokenTimeMs !== undefined && (
                                    <span className="ml-1 opacity-75">
                                        ({t('metrics_ttft')}: {(firstTokenTimeMs / 1000).toFixed(2)}s)
                                    </span>
                                )}
                            </span>
                        </>
                    ) : (
                        <div className="flex items-baseline gap-2 min-w-0">
                            <span className="text-base text-[var(--theme-text-secondary)] font-medium truncate opacity-90">
                                {thinkingTimeMs !== undefined
                                    ? t('thinking_took_time').replace('{duration}', formatDuration(Math.round(thinkingTimeMs / 1000)))
                                    : 'Thought Process'}
                            </span>
                            {firstTokenTimeMs !== undefined && (
                                <span className="text-xs text-[var(--theme-text-tertiary)] truncate font-mono flex-shrink-0">
                                    ({t('metrics_ttft')}: {(firstTokenTimeMs / 1000).toFixed(2)}s)
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Chevron */}
                <div className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-[var(--theme-bg-input)] transition-colors flex-shrink-0">
                    <ChevronDown size={14} className="text-[var(--theme-text-tertiary)] transition-transform duration-300 group-open:rotate-180" strokeWidth={2.5}/>
                </div>
            </div>
        </div>
    );
};
