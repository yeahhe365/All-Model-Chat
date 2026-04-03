
import React, { useMemo, useState } from 'react';
import { SavedScenario } from '../../types';
import { Search, Layers, User, Shield, Inbox } from 'lucide-react';
import { ScenarioItem } from './ScenarioItem';
import { translations } from '../../utils/appUtils';

interface ScenarioListProps {
  scenarios: SavedScenario[];
  systemScenarioIds: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onLoad: (scenario: SavedScenario) => void;
  onEdit: (scenario: SavedScenario) => void;
  onDelete: (id: string) => void;
  onDuplicate: (scenario: SavedScenario) => void;
  onExport: (scenario: SavedScenario) => void;
  onView?: (scenario: SavedScenario) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

type TabType = 'all' | 'mine' | 'system';

export const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarios,
  systemScenarioIds,
  searchQuery,
  setSearchQuery,
  onLoad,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onView,
  t
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const filteredScenarios = useMemo(() => {
    let list = scenarios;
    
    // Filter by Tab
    if (activeTab === 'mine') {
        list = list.filter(s => !systemScenarioIds.includes(s.id));
    } else if (activeTab === 'system') {
        list = list.filter(s => systemScenarioIds.includes(s.id));
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(lowerQuery) ||
        s.messages.some(m => m.content.toLowerCase().includes(lowerQuery)) ||
        (s.systemInstruction && s.systemInstruction.toLowerCase().includes(lowerQuery))
      );
    }
    
    return list;
  }, [scenarios, searchQuery, activeTab, systemScenarioIds]);

  const tabs: { id: TabType; labelKey: string; icon: any }[] = [
      { id: 'all', labelKey: 'scenarios_tab_all', icon: Layers },
      { id: 'mine', labelKey: 'scenarios_tab_mine', icon: User },
      { id: 'system', labelKey: 'scenarios_tab_system', icon: Shield },
  ];

  return (
    <div className="flex flex-col h-full space-y-4 sm:space-y-6">
      {/* Controls Container */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-shrink-0">
        
        {/* Search Bar */}
        <div className="relative flex-grow group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--theme-text-tertiary)] group-focus-within:text-[var(--theme-text-primary)] transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder={t('history_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-xl text-sm font-medium text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent transition-all shadow-sm"
          />
        </div>

        {/* Tabs - Segmented Control */}
        <div className="flex p-1 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-xl sm:w-auto w-full self-start sm:self-auto overflow-x-auto no-scrollbar">
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                            ${isActive 
                                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm text-[var(--theme-text-link)]' 
                                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
                            }
                        `}
                    >
                        <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className={isActive ? "text-[var(--theme-text-link)]" : ""} />
                        <span>{t(tab.labelKey as any)}</span>
                    </button>
                );
            })}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 pb-4 min-h-0">
        {filteredScenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--theme-text-tertiary)]">
            <div className="p-4 rounded-full bg-[var(--theme-bg-input)] mb-4">
                <Inbox size={48} className="opacity-30" strokeWidth={1} />
            </div>
            <p className="text-base font-medium text-[var(--theme-text-secondary)]">No scenarios found.</p>
            {searchQuery && (
                <button 
                    onClick={() => setSearchQuery('')} 
                    className="mt-2 text-[var(--theme-text-link)] hover:underline text-sm"
                >
                    Clear search query
                </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 sm:pb-0">
            {filteredScenarios.map(s => {
                const isSystem = systemScenarioIds.includes(s.id);
                return (
                  <ScenarioItem
                    key={s.id}
                    scenario={s}
                    isSystem={isSystem}
                    onLoad={onLoad}
                    onEdit={isSystem ? undefined : onEdit}
                    onDelete={isSystem ? undefined : onDelete}
                    onDuplicate={onDuplicate}
                    onExport={onExport}
                    onView={isSystem ? onView : undefined}
                    t={t}
                  />
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
