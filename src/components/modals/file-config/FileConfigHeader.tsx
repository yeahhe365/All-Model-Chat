import React from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { Settings2, Scissors, X } from 'lucide-react';
import { FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS } from '../../../constants/appConstants';

interface FileConfigHeaderProps {
  onClose: () => void;
  showResolutionSettings: boolean;
  isVideo: boolean;
}

export const FileConfigHeader: React.FC<FileConfigHeaderProps> = ({ onClose, showResolutionSettings, isVideo }) => {
  const { t } = useI18n();
  return (
    <div className="p-4 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] flex justify-between items-center rounded-t-xl">
      <h3 className="font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
        {showResolutionSettings ? <Settings2 size={18} /> : isVideo ? <Scissors size={18} /> : <Settings2 size={18} />}
        {t('fileSettings_title')}
      </h3>
      <button
        onClick={onClose}
        className={`text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-full p-1 ${FOCUS_VISIBLE_RING_SECONDARY_OFFSET_CLASS}`}
      >
        <X size={20} />
      </button>
    </div>
  );
};
