import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp } from 'lucide-react';
import { translations } from '../../../utils/appUtils';

interface WelcomeScreenProps {
    t: (key: keyof typeof translations, fallback?: string) => string;
    onSuggestionClick?: (suggestion: string) => void;
    onOrganizeInfoClick?: (suggestion: string) => void;
    showSuggestions: boolean;
    themeId: string;
}

const SUGGESTIONS_KEYS = [
  { titleKey: 'suggestion_organize_title', descKey: 'suggestion_organize_desc', shortKey: 'suggestion_organize_short', specialAction: 'organize' },
  { titleKey: 'suggestion_translate_title', descKey: 'suggestion_translate_desc', shortKey: 'suggestion_translate_short' },
  { titleKey: 'suggestion_ocr_title', descKey: 'suggestion_ocr_desc', shortKey: 'suggestion_ocr_short' },
  { titleKey: 'suggestion_explain_title', descKey: 'suggestion_explain_desc', shortKey: 'suggestion_explain_short' },
  { titleKey: 'suggestion_summarize_title', descKey: 'suggestion_summarize_desc', shortKey: 'suggestion_summarize_short' },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    t, 
    onSuggestionClick, 
    onOrganizeInfoClick, 
    showSuggestions, 
    themeId 
}) => {
    const [suggestionPage, setSuggestionPage] = useState(0);
    
    const suggestionsPerPage = 4;
    const totalSuggestionPages = Math.ceil(SUGGESTIONS_KEYS.length / suggestionsPerPage);
    const paginatedSuggestions = SUGGESTIONS_KEYS.slice(
        suggestionPage * suggestionsPerPage, 
        (suggestionPage * suggestionsPerPage) + suggestionsPerPage
    );

    const borderClass = themeId === 'onyx' 
        ? 'border border-white/5' 
        : 'border border-[var(--theme-border-secondary)]/50';

    return (
        <div className="flex flex-col items-center justify-center min-h-full w-full max-w-4xl mx-auto px-4 pb-16">
          <div className="w-full">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-center text-[var(--theme-text-primary)] mb-6 sm:mb-12 welcome-message-animate tracking-tight">
              {t('welcome_greeting')}
            </h1>
            
            {showSuggestions && (
              <>
                <div className="flex items-center justify-end mb-4 px-1">
                    {totalSuggestionPages > 1 && (
                        <div className="flex items-center bg-[var(--theme-bg-tertiary)]/50 rounded-full p-1 pl-3">
                            <span className="text-xs font-medium tabular-nums mr-2 text-[var(--theme-text-secondary)]">
                                {suggestionPage + 1} / {totalSuggestionPages}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setSuggestionPage(p => Math.max(0, p - 1))}
                                    disabled={suggestionPage === 0}
                                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--theme-bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[var(--theme-text-primary)]"
                                    aria-label="Previous suggestions"
                                >
                                    <ChevronLeft size={14} strokeWidth={1.5} />
                                </button>
                                <button
                                    onClick={() => setSuggestionPage(p => Math.min(totalSuggestionPages - 1, p + 1))}
                                    disabled={suggestionPage >= totalSuggestionPages - 1}
                                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--theme-bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[var(--theme-text-primary)]"
                                    aria-label="Next suggestions"
                                >
                                    <ChevronRight size={14} strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {paginatedSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                          const text = t(s.descKey as any);
                          if ((s as any).specialAction === 'organize' && onOrganizeInfoClick) {
                              onOrganizeInfoClick(text);
                          } else if (onSuggestionClick) {
                              onSuggestionClick(text);
                          }
                      }}
                      className={`
                        relative flex flex-col text-left
                        h-28 sm:h-36 p-3 sm:p-5 rounded-xl sm:rounded-2xl
                        bg-[var(--theme-bg-tertiary)]/30 
                        ${borderClass}
                        hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-text-tertiary)]
                        hover:shadow-lg hover:-translate-y-1
                        transition-all duration-300 ease-out group
                        focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]
                        overflow-hidden
                      `}
                      style={{ animation: `fadeInUp 0.5s ${0.1 + i * 0.1}s ease-out both` }}
                    >
                      <div className="relative z-10">
                        <h3 className="font-bold text-sm sm:text-base text-[var(--theme-text-primary)] mb-1 sm:mb-2 transition-colors duration-300">
                            {t(s.titleKey as any)}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] leading-relaxed line-clamp-2 opacity-80 group-hover:opacity-100">
                            {t((s as any).shortKey as any)}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-end mt-auto relative z-10">
                        <span className="text-[9px] sm:text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-75">
                          {t('suggestion_prompt_label')}
                        </span>
                        <div className="
                            w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full 
                            bg-[var(--theme-bg-primary)] text-[var(--theme-text-tertiary)]
                            shadow-sm
                            group-hover:bg-[var(--theme-text-primary)] group-hover:text-[var(--theme-bg-primary)]
                            transition-all duration-300 transform group-hover:scale-110
                        ">
                            <ArrowUp size={14} strokeWidth={1.5} />
                        </div>
                      </div>
                      
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[var(--theme-text-primary)]/5 to-transparent rounded-bl-3xl rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    </button>
                  ))}
                  
                  {Array.from({ length: Math.max(0, suggestionsPerPage - paginatedSuggestions.length) }).map((_, i) => (
                    <div key={`placeholder-${i}`} className="h-28 sm:h-36 rounded-xl sm:rounded-2xl border border-dashed border-[var(--theme-border-secondary)]/30" />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
    );
};