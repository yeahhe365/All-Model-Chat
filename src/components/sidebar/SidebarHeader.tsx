import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { IconSidebarToggle } from '@/components/icons/CustomIcons';
import { FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS } from '@/constants/appConstants';

interface SidebarHeaderProps {
  onToggle: () => void;
  isOpen: boolean;
  themeId: string;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onToggle, isOpen, themeId }) => {
  const { t } = useI18n();
  const sidebarToggleLabel = isOpen ? t('historySidebarClose') : t('historySidebarOpen');

  return (
    <div className="p-2 sm:p-3 flex items-center justify-between flex-shrink-0 h-[60px]">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-2 pl-2 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
        aria-label={`${sidebarToggleLabel} AMC WebUI`}
      >
        <img
          src={themeId === 'onyx' ? '/sidebar-logo-dark.png' : '/sidebar-logo.png'}
          alt="AMC WebUI"
          className="h-8 w-auto object-contain"
        />
      </button>
      <button
        onClick={onToggle}
        className={`p-2 -translate-y-1 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-md ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
        aria-label={sidebarToggleLabel}
      >
        <IconSidebarToggle size={20} strokeWidth={2} />
      </button>
    </div>
  );
};
