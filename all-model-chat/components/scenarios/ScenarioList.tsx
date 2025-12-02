
import React, { useMemo } from 'react';
import { SavedScenario } from '../../types';
import { Search } from 'lucide-react';
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
  onExport: (scenario: SavedScenario) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarios,
  systemScenarioIds,
  searchQuery,
  setSearchQuery,
  onLoad,
  onEdit,
  onDelete,
  onExport,
  t
}) => {
  const filteredScenarios = useMemo(() => {
    if (!searchQuery.trim()) return scenarios;
    const lowerQuery = searchQuery.toLowerCase();
    return scenarios.filter(s =>
      s.title.toLowerCase().includes(lowerQuery) ||
      s.messages.some(m => m.content.toLowerCase().includes(lowerQuery))
    );
  }, [scenarios, searchQuery]);

  const systemScenarios = filteredScenarios.filter(s => systemScenarioIds.includes(s.id));
  const userScenarios = filteredScenarios.filter(s => !systemScenarioIds.includes(s.id));

  return (
    <>
      {/* Search Bar */}
      <div className="sticky top-0 z-10 pb-4 bg-[var(--theme-bg-tertiary)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)]" size={16} />
          <input
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-xl text-sm text-[var(--theme-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] transition-all"
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6 pr-1 pb-2">
        {filteredScenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--theme-text-tertiary)]">
            <Search size={32} className="mb-3 opacity-20" />
            <p className="text-sm">No scenarios found.</p>
            {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-2 text-[var(--theme-text-link)] hover:underline text-xs">Clear search</button>}
          </div>
        ) : (
          <>
            {userScenarios.length > 0 && (
              <div className="space-y-2">
                {userScenarios.map(s => (
                  <ScenarioItem
                    key={s.id}
                    scenario={s}
                    isSystem={false}
                    onLoad={onLoad}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onExport={onExport}
                    t={t}
                  />
                ))}
              </div>
            )}

            {systemScenarios.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] px-1 mt-4 mb-2">System Presets</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {systemScenarios.map(s => (
                    <ScenarioItem
                      key={s.id}
                      scenario={s}
                      isSystem={true}
                      onLoad={onLoad}
                      onExport={onExport}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
