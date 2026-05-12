import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Download } from 'lucide-react';
import { type ChatMessage } from '@/types';
import { useMessageExport } from '@/hooks/useMessageExport';
import { useResponsiveValue } from '@/hooks/useDevice';
import { ExportModal } from './export/ExportModal';

interface ExportMessageButtonProps {
  message: ChatMessage;
  sessionTitle?: string;
  messageIndex?: number;
  themeId: string;
  className?: string;
  iconSize?: number;
}

export const ExportMessageButton: React.FC<ExportMessageButtonProps> = ({
  message,
  sessionTitle,
  messageIndex,
  themeId,
  className,
  iconSize: propIconSize,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const responsiveIconSize = useResponsiveValue(14, 16);
  const iconSize = propIconSize ?? responsiveIconSize;

  const { exportingType, handleExport } = useMessageExport({
    message,
    sessionTitle,
    messageIndex,
    themeId,
  });

  const onExportSelect = (type: 'png' | 'html' | 'txt' | 'json') => {
    handleExport(type, () => setIsOpen(false));
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={`${className}`} aria-label={t('export')} title={t('export')}>
        <Download size={iconSize} strokeWidth={1.5} />
      </button>

      {isOpen && (
        <ExportModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onExport={onExportSelect}
          exportingType={exportingType}
        />
      )}
    </>
  );
};
