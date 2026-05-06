import React from 'react';
import { useI18n } from '../../../../contexts/I18nContext';
import { Quote, Copy, Check, CornerRightDown, Volume2 } from 'lucide-react';
import { IconGoogle } from '../../../icons/CustomIcons';
import { translations } from '@/i18n/translations';

interface StandardActionsViewProps {
  onQuote: (e: React.MouseEvent) => void;
  onInsert?: (e: React.MouseEvent) => void;
  onCopy: (e: React.MouseEvent) => void;
  onSearch: (e: React.MouseEvent) => void;
  onTTS?: (e: React.MouseEvent) => void;
  isCopied: boolean;
  t?: (key: keyof typeof translations) => string;
}

export const StandardActionsView: React.FC<StandardActionsViewProps> = ({
  onQuote,
  onInsert,
  onCopy,
  onSearch,
  onTTS,
  isCopied,
}) => {
  const { t } = useI18n();
  const quoteLabel = t ? t('quote') : 'Quote';
  const insertLabel = t ? t('fill_input') : 'Insert';
  const copyLabel = isCopied ? (t ? t('copied') : 'Copied') : t ? t('copy') : 'Copy';
  const searchLabel = t ? t('search') : 'Search';
  const actionButtonClass =
    'flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium text-[var(--theme-text-primary)] transition-all hover:bg-[var(--theme-bg-tertiary)] sm:px-3';

  return (
    <>
      <button onMouseDown={onQuote} className={actionButtonClass} title={quoteLabel} aria-label={quoteLabel}>
        <Quote size={14} className="text-[var(--theme-text-link)]" />
        <span>{quoteLabel}</span>
      </button>

      {onInsert && (
        <>
          <div className="mx-0.5 h-3.5 w-px shrink-0 bg-[var(--theme-border-secondary)]" />
          <button onMouseDown={onInsert} className={actionButtonClass} title={insertLabel} aria-label={insertLabel}>
            <CornerRightDown size={14} className="text-[var(--theme-text-secondary)]" />
            <span>{insertLabel}</span>
          </button>
        </>
      )}

      <div className="mx-0.5 h-3.5 w-px shrink-0 bg-[var(--theme-border-secondary)]" />

      <button onMouseDown={onCopy} className={actionButtonClass} title={copyLabel} aria-label={copyLabel}>
        {isCopied ? (
          <Check size={14} className="text-[var(--theme-text-success)]" />
        ) : (
          <Copy size={14} className="text-[var(--theme-text-tertiary)]" />
        )}
        <span>{copyLabel}</span>
      </button>

      <div className="mx-0.5 h-3.5 w-px shrink-0 bg-[var(--theme-border-secondary)]" />

      <button onMouseDown={onSearch} className={actionButtonClass} title={searchLabel} aria-label={searchLabel}>
        <IconGoogle size={14} />
        <span>{searchLabel}</span>
      </button>

      {onTTS && (
        <>
          <div className="mx-0.5 h-3.5 w-px shrink-0 bg-[var(--theme-border-secondary)]" />
          <button onMouseDown={onTTS} className={actionButtonClass} title="Read Aloud (TTS)">
            <Volume2 size={14} className="text-purple-500" />
            <span>TTS</span>
          </button>
        </>
      )}
    </>
  );
};
