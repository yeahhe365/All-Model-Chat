
import React from 'react';
import { SavedScenario } from '../../types';
import { Play, Download, Edit3, Trash2, Shield, MessageSquare } from 'lucide-react';
import { translations } from '../../utils/appUtils';

interface ScenarioItemProps {
  scenario: SavedScenario;
  isSystem: boolean;
  onLoad: (scenario: SavedScenario) => void;
  onEdit?: (scenario: SavedScenario) => void;
  onDelete?: (id: string) => void;
  onExport: (scenario: SavedScenario) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioItem: React.FC<ScenarioItemProps> = ({
  scenario,
  isSystem,
  onLoad,
  onEdit,
  onDelete,
  onExport,
  t
}) => {
  return (
    <div
      className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] rounded-xl transition-all duration-200 cursor-pointer"
      onClick={() => onLoad(scenario)}
    >
      <div className="flex-grow min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1">
          {isSystem ? (
            <Shield size={14} className="text-[var(--theme-bg-accent)] flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <MessageSquare size={14} className="text-[var(--theme-text-tertiary)] group-hover:text-[var(--theme-text-primary)] transition-colors flex-shrink-0" strokeWidth={2} />
          )}
          <h3 className="font-semibold text-[var(--theme-text-primary)] truncate text-sm sm:text-base">
            {scenario.title}
          </h3>
        </div>
        <p className="text-[var(--theme-text-tertiary)] text-xs flex items-center gap-3">
          <span>{scenario.messages.length} msgs</span>
          {scenario.systemInstruction && (
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[var(--theme-text-tertiary)]"></span>
              System Prompt
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onLoad(scenario); }}
          className="p-2 bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] rounded-lg transition-colors shadow-sm"
          title={t('scenarios_load_title')}
        >
          <Play size={14} strokeWidth={2} fill="currentColor" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onExport(scenario); }}
          className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
          title={t('scenarios_export_single_title', 'Export scenario')}
        >
          <Download size={16} strokeWidth={1.5} />
        </button>

        {!isSystem && onEdit && onDelete && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(scenario); }}
              className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
              title={t('scenarios_edit_title')}
            >
              <Edit3 size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(scenario.id); }}
              className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded-lg transition-colors"
              title={t('scenarios_delete_title')}
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
