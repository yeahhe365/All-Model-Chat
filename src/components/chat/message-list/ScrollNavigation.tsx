
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface ScrollNavigationProps {
    showUp: boolean;
    showDown: boolean;
    onScrollToPrev: () => void;
    onScrollToNext: () => void;
    bottomOffset: number;
}

export const ScrollNavigation: React.FC<ScrollNavigationProps> = ({ 
    showUp, 
    showDown, 
    onScrollToPrev, 
    onScrollToNext, 
    bottomOffset 
}) => {
    if (!showUp && !showDown) return null;

    return (
        <div
            className="absolute z-30 right-3 sm:right-6 flex flex-col items-end gap-3 pointer-events-none transition-all duration-300 ease-out"
            style={{ 
                bottom: `${bottomOffset + 20}px`,
                animation: 'fadeIn 0.3s ease-out both' 
            }}
        >
            {showUp && (
                <button
                    onClick={onScrollToPrev}
                    className="
                        p-2.5 rounded-full 
                        bg-[var(--theme-bg-secondary)]/90 backdrop-blur-sm
                        border border-[var(--theme-border-secondary)] 
                        text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] 
                        hover:bg-[var(--theme-bg-primary)] hover:border-[var(--theme-border-focus)]
                        transition-colors duration-200
                        focus:outline-none
                        pointer-events-auto
                        shadow-md
                    "
                    aria-label="Scroll to previous message"
                    title="Scroll to previous message"
                >
                    <ArrowUp size={18} strokeWidth={2.5} />
                </button>
            )}
            {showDown && (
                <button
                    onClick={onScrollToNext}
                    className="
                        p-2.5 rounded-full 
                        bg-[var(--theme-bg-secondary)]/90 backdrop-blur-sm
                        border border-[var(--theme-border-secondary)] 
                        text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] 
                        hover:bg-[var(--theme-bg-primary)] hover:border-[var(--theme-border-focus)]
                        transition-colors duration-200
                        focus:outline-none
                        pointer-events-auto
                        shadow-md
                    "
                    aria-label="Scroll down"
                    title="Scroll down"
                >
                    <ArrowDown size={18} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
};
