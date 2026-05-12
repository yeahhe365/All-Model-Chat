import React from 'react';
import { PictureInPicture2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface PiPPlaceholderProps {
  onClosePip: () => void;
}

export const PiPPlaceholder: React.FC<PiPPlaceholderProps> = ({ onClosePip }) => {
  const { t } = useI18n();

  return (
    <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-[var(--theme-bg-secondary)]">
      <PictureInPicture2 size={48} className="text-[var(--theme-text-link)] mb-4" />
      <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">{t('pipPlaceholderTitle')}</h2>
      <p className="text-sm text-[var(--theme-text-secondary)] mt-2 max-w-xs">{t('pipPlaceholderDescription')}</p>
      <button
        onClick={onClosePip}
        className="mt-6 px-4 py-2 bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] rounded-lg font-medium hover:bg-[var(--theme-bg-accent-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]"
      >
        {t('pipPlaceholderClose')}
      </button>
    </div>
  );
};
