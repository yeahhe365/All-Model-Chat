
import React from 'react';
import { translations } from '../../utils/translations';
import { IconSidebarToggle } from '../icons/CustomIcons';
import { FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS } from '../../constants/appConstants';

interface SidebarHeaderProps {
  onToggle: () => void;
  isOpen: boolean;
  t: (key: keyof typeof translations) => string;
  themeId: string;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onToggle, isOpen, t, themeId }) => (
  <div className="p-2 sm:p-3 flex items-center justify-between flex-shrink-0 h-[60px]">
    <a href="https://all-model-chat.pages.dev/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 pl-2 no-underline hover:opacity-80 transition-opacity">
      <img src={themeId === 'onyx' ? '/sidebar-logo-dark.png' : '/sidebar-logo.png'} alt="All Model Chat" className="h-8 w-auto object-contain" />
    </a>
    <button onClick={onToggle} className={`p-2 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-md ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`} aria-label={isOpen ? t('historySidebarClose') : t('historySidebarOpen')}>
      <IconSidebarToggle size={20} strokeWidth={2} />
    </button>
  </div>
);
