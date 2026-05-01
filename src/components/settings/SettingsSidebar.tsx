import React, { useRef } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { KeyRound, LayoutPanelLeft, SlidersHorizontal } from 'lucide-react';
import { X } from 'lucide-react';
import { SettingsTab, type SettingsTabDescriptor } from '../../hooks/features/useSettingsLogic';
import { IconAbout, IconData, IconKeyboard } from '../icons/CustomIcons';

const SETTINGS_TAB_ICONS: Record<SettingsTab, React.ElementType> = {
  models: SlidersHorizontal,
  interface: LayoutPanelLeft,
  api: KeyRound,
  data: IconData,
  shortcuts: IconKeyboard,
  about: IconAbout,
};

interface SettingsSidebarProps {
  tabs: SettingsTabDescriptor[];
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
  onClose: () => void;
}

const SIDEBAR_GROUPS: Array<{ id: string; tabIds: SettingsTab[] }> = [
  {
    id: 'primary',
    tabIds: ['models', 'api', 'interface', 'data'],
  },
  {
    id: 'shortcuts',
    tabIds: ['shortcuts'],
  },
  {
    id: 'about',
    tabIds: ['about'],
  },
];

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ tabs, activeTab, setActiveTab, onClose }) => {
  const { t } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const tabsById = new Map(tabs.map((tab) => [tab.id, tab]));
  const groupedTabs = SIDEBAR_GROUPS.map((group) => ({
    id: group.id,
    tabs: group.tabIds.map((tabId) => tabsById.get(tabId)).filter((tab): tab is SettingsTabDescriptor => !!tab),
  })).filter((group) => group.tabs.length > 0);

  const renderTabButton = (tab: SettingsTabDescriptor) => {
    const Icon = SETTINGS_TAB_ICONS[tab.id];
    const isActive = activeTab === tab.id;

    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`flex-shrink-0 flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 text-sm font-medium rounded-lg transition-all outline-none select-none w-auto md:w-full text-left
                      ${
                        isActive
                          ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                          : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                      }
                      focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)]
                      `}
        role="tab"
        aria-selected={isActive}
      >
        <Icon
          size={18}
          strokeWidth={isActive ? 2 : 1.5}
          className={isActive ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)]'}
        />
        <span>{t(tab.labelKey)}</span>
      </button>
    );
  };

  return (
    <aside className="flex-shrink-0 w-full md:w-64 bg-[var(--theme-bg-secondary)] border-b md:border-b-0 md:border-r border-[var(--theme-border-primary)] flex flex-col">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-5 flex-shrink-0">
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="p-2 rounded-md hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
          aria-label={t('close')}
        >
          <X size={20} strokeWidth={2} />
        </button>
        {/* Mobile Title */}
        <span className="md:hidden font-semibold text-[var(--theme-text-primary)]">{t('settingsTitle')}</span>
        <div className="w-8 md:hidden"></div>
      </div>

      {/* Navigation List */}
      <nav
        className="flex-1 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden custom-scrollbar px-2 pb-2 md:px-3 md:pb-3 flex md:flex-col gap-1 md:gap-1.5"
        role="tablist"
      >
        {groupedTabs.map((group) => (
          <div
            key={group.id}
            data-settings-group={group.id}
            className="flex flex-shrink-0 md:w-full md:flex-col gap-1 md:gap-1.5"
          >
            {group.tabs.map(renderTabButton)}
          </div>
        ))}
      </nav>
    </aside>
  );
};
