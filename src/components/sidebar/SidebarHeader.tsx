
import React from 'react';
import { translations } from '../../utils/appUtils';
import { AppLogo } from '../icons/AppLogo';
import { IconSidebarToggle } from '../icons/CustomIcons';

interface SidebarHeaderProps {
  onToggle: () => void;
  isOpen: boolean;
  t: (key: keyof typeof translations) => string;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onToggle, isOpen, t }) => (
  <div className="pl-[calc(env(safe-area-inset-left,0px)+0.5rem)] pr-[calc(env(safe-area-inset-right,0px)+0.5rem)] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2 sm:pl-[calc(env(safe-area-inset-left,0px)+0.75rem)] sm:pr-[calc(env(safe-area-inset-right,0px)+0.75rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:pb-3 flex items-center justify-between flex-shrink-0 min-h-[60px]">
    <a href="https://all-model-chat.pages.dev/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 pl-2 no-underline hover:opacity-80 transition-opacity">
      <AppLogo className="h-8 w-auto" ariaLabel={t('app_logo_label')} />
    </a>
    <button onClick={onToggle} className="p-2 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-md" aria-label={isOpen ? t('historySidebarClose') : t('historySidebarOpen')}>
      <IconSidebarToggle size={20} strokeWidth={2} />
    </button>
  </div>
);
