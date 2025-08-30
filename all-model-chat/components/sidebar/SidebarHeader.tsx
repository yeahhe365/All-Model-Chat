import React from 'react';
import { PanelLeftClose } from 'lucide-react';
import { APP_LOGO_SVG_DATA_URI } from '../../constants/appConstants';
import { translations } from '../../utils/appUtils';

interface SidebarHeaderProps {
  onToggle: () => void;
  isOpen: boolean;
  t: (key: keyof typeof translations) => string;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onToggle, isOpen, t }) => (
  <div className="p-2 sm:p-3 flex items-center justify-between flex-shrink-0 h-[60px]">
    <a href="https://all-model-chat.pages.dev/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 pl-2 no-underline hover:opacity-80 transition-opacity">
      <img src={APP_LOGO_SVG_DATA_URI} alt="All Model Chat Logo" className="w-6 h-6" />
      <span className="text-lg font-semibold text-[var(--theme-text-primary)]">All Model Chat</span>
    </a>
    <button onClick={onToggle} className="p-2 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md" aria-label={isOpen ? t('historySidebarClose') : t('historySidebarOpen')}>
      <PanelLeftClose size={20} />
    </button>
  </div>
);
