
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SUGGESTIONS_KEYS } from '../../../../constants/appConstants';
import { SuggestionIcon } from './SuggestionIcon';
import { translations } from '../../../../utils/appUtils';

interface ChatSuggestionsProps {
    show: boolean;
    onSuggestionClick?: (suggestion: string) => void;
    onOrganizeInfoClick?: (suggestion: string) => void;
    t: (key: keyof typeof translations) => string;
    isFullscreen: boolean;
}

export const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ show, onSuggestionClick, onOrganizeInfoClick, t, isFullscreen }) => {
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [isSuggestionsHovered, setIsSuggestionsHovered] = useState(false);

    const checkScroll = useCallback(() => {
        if (suggestionsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = suggestionsRef.current;
            setShowLeftArrow(scrollLeft > 5); // Small threshold
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
        }
    }, []);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [checkScroll, show]);

    const handleScroll = (direction: 'left' | 'right') => {
        if (suggestionsRef.current) {
            const scrollAmount = suggestionsRef.current.clientWidth * 0.6;
            suggestionsRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (!show || isFullscreen) return null;

    return (
        <div 
            className="relative group/suggestions mb-2"
            onMouseEnter={() => setIsSuggestionsHovered(true)}
            onMouseLeave={() => setIsSuggestionsHovered(false)}
        >
            <div 
                ref={suggestionsRef}
                onScroll={checkScroll}
                className="flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar fade-mask-x scroll-smooth"
            >
                {SUGGESTIONS_KEYS.map((s, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => {
                            const text = t(s.descKey as any);
                            if ((s as any).specialAction === 'organize' && onOrganizeInfoClick) {
                                onOrganizeInfoClick(text);
                            } else if (onSuggestionClick) {
                                onSuggestionClick(text);
                            }
                        }}
                        className="
                            flex items-center gap-2 px-4 py-2.5 rounded-xl
                            bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)]
                            border border-[var(--theme-border-secondary)]
                            text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]
                            text-sm font-medium whitespace-nowrap
                            transition-all active:scale-95 shadow-sm
                        "
                    >
                        <SuggestionIcon iconName={(s as any).icon} />
                        <span>{t(s.titleKey as any)}</span>
                    </button>
                ))}
            </div>

            {/* Navigation Arrows (Visible on Hover) */}
            {showLeftArrow && (
                <button
                    type="button"
                    onClick={() => handleScroll('left')}
                    className={`absolute left-0 top-1/2 -translate-y-[calc(50%+4px)] z-10 p-1.5 rounded-full bg-[var(--theme-bg-primary)]/80 backdrop-blur-sm border border-[var(--theme-border-secondary)] shadow-md text-[var(--theme-text-primary)] transition-all duration-200 hover:scale-110 active:scale-95 ${isSuggestionsHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    aria-label="Scroll left"
                >
                    <ChevronLeft size={16} strokeWidth={2} />
                </button>
            )}
            {showRightArrow && (
                <button
                    type="button"
                    onClick={() => handleScroll('right')}
                    className={`absolute right-0 top-1/2 -translate-y-[calc(50%+4px)] z-10 p-1.5 rounded-full bg-[var(--theme-bg-primary)]/80 backdrop-blur-sm border border-[var(--theme-border-secondary)] shadow-md text-[var(--theme-text-primary)] transition-all duration-200 hover:scale-110 active:scale-95 ${isSuggestionsHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    aria-label="Scroll right"
                >
                    <ChevronRight size={16} strokeWidth={2} />
                </button>
            )}
        </div>
    );
};
