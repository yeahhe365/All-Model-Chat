
import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { SettingsTab } from '../../hooks/features/useSettingsLogic';
import { translations } from '../../utils/appUtils';

interface SettingsSidebarProps {
    tabs: Array<{ id: SettingsTab; labelKey: string; icon: React.ElementType }>;
    activeTab: SettingsTab;
    setActiveTab: (tab: SettingsTab) => void;
    onClose: () => void;
    t: (key: keyof typeof translations) => string;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
    tabs,
    activeTab,
    setActiveTab,
    onClose,
    t
}) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

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
            <nav className="flex-1 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden custom-scrollbar px-2 pb-2 md:px-3 md:pb-3 flex md:flex-col gap-1 md:gap-1.5" role="tablist">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 text-sm font-medium rounded-lg transition-all outline-none select-none w-auto md:w-full text-left
                            ${isActive
                                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                }
                            focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)]
                            `}
                            role="tab"
                            aria-selected={isActive}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className={isActive ? "text-[var(--theme-text-primary)]" : "text-[var(--theme-text-tertiary)]"} />
                            <span>{t(tab.labelKey as any)}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
};
