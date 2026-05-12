import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ScrollNavigationProps {
  showUp: boolean;
  showDown: boolean;
  onScrollToPrev: () => void;
  onScrollToNext: () => void;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
  bottomOffset: number;
}

const SINGLE_CLICK_DELAY_MS = 180;

export const ScrollNavigation: React.FC<ScrollNavigationProps> = ({
  showUp,
  showDown,
  onScrollToPrev,
  onScrollToNext,
  onScrollToTop,
  onScrollToBottom,
  bottomOffset,
}) => {
  const { t } = useI18n();
  const prevClickTimeoutRef = React.useRef<number | null>(null);
  const nextClickTimeoutRef = React.useRef<number | null>(null);

  const clearScheduledClick = React.useCallback((timeoutRef: React.MutableRefObject<number | null>) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      clearScheduledClick(prevClickTimeoutRef);
      clearScheduledClick(nextClickTimeoutRef);
    };
  }, [clearScheduledClick]);

  const handleSingleClick = React.useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      timeoutRef: React.MutableRefObject<number | null>,
      action: () => void,
    ) => {
      if (event.detail > 1) {
        return;
      }

      clearScheduledClick(timeoutRef);
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        action();
      }, SINGLE_CLICK_DELAY_MS);
    },
    [clearScheduledClick],
  );

  const handleDoubleClick = React.useCallback(
    (timeoutRef: React.MutableRefObject<number | null>, action: () => void) => {
      clearScheduledClick(timeoutRef);
      action();
    },
    [clearScheduledClick],
  );

  if (!showUp && !showDown) return null;

  return (
    <div
      className="absolute z-30 right-3 sm:right-6 flex flex-col items-end gap-3 pointer-events-none transition-all duration-300 ease-out"
      style={{
        bottom: `${bottomOffset + 20}px`,
        animation: 'fadeIn 0.3s ease-out both',
      }}
    >
      {showUp && (
        <button
          onClick={(event) => handleSingleClick(event, prevClickTimeoutRef, onScrollToPrev)}
          onDoubleClick={() => handleDoubleClick(prevClickTimeoutRef, onScrollToTop)}
          className="
                        p-2.5 rounded-full 
                        bg-[var(--theme-bg-secondary)]
                        border border-[var(--theme-border-secondary)] 
                        text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] 
                        hover:bg-[var(--theme-bg-primary)] hover:border-[var(--theme-border-focus)]
                        transition-colors duration-200
                        focus:outline-none
                        pointer-events-auto
                        shadow-md
                    "
          aria-label={t('scroll_previous_turn')}
          title={t('scroll_previous_turn')}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      )}
      {showDown && (
        <button
          onClick={(event) => handleSingleClick(event, nextClickTimeoutRef, onScrollToNext)}
          onDoubleClick={() => handleDoubleClick(nextClickTimeoutRef, onScrollToBottom)}
          className="
                        p-2.5 rounded-full 
                        bg-[var(--theme-bg-secondary)]
                        border border-[var(--theme-border-secondary)] 
                        text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] 
                        hover:bg-[var(--theme-bg-primary)] hover:border-[var(--theme-border-focus)]
                        transition-colors duration-200
                        focus:outline-none
                        pointer-events-auto
                        shadow-md
                    "
          aria-label={t('scroll_next_turn')}
          title={t('scroll_next_turn')}
        >
          <ArrowDown size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};
