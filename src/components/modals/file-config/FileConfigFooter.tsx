import React from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { Save } from 'lucide-react';

interface FileConfigFooterProps {
  onClose: () => void;
  onSave: () => void;
}

export const FileConfigFooter: React.FC<FileConfigFooterProps> = ({ onClose, onSave }) => {
  const { t } = useI18n();
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)]"
      >
        {t('cancel')}
      </button>
      <button
        onClick={onSave}
        className="px-4 py-2 text-sm bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] rounded-lg transition-colors flex items-center gap-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)]"
      >
        <Save size={16} />
        {t('videoSettings_save')}
      </button>
    </div>
  );
};
