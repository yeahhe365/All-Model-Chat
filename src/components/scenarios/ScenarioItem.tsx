
import React from 'react';
import { SavedScenario } from '../../types';
import { Download, Edit3, Trash2, Shield, MessageSquare, Eye, Copy, Sparkles } from 'lucide-react';
import { translations } from '../../utils/appUtils';

interface ScenarioItemProps {
  scenario: SavedScenario;
  isSystem: boolean;
  onLoad: (scenario: SavedScenario) => void;
  onEdit?: (scenario: SavedScenario) => void;
  onDelete?: (id: string) => void;
  onDuplicate: (scenario: SavedScenario) => void;
  onExport: (scenario: SavedScenario) => void;
  onView?: (scenario: SavedScenario) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioItem: React.FC<ScenarioItemProps> = ({
  scenario,
  isSystem,
  onLoad,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onView,
  t
}) => {
  const messageCount = scenario.messages.length;
  const hasSystemPrompt = !!scenario.systemInstruction;

  const Icon = isSystem ? Shield : MessageSquare;
  const iconColorClass = isSystem 
    ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10' 
    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';

  return (
    <div
      className="
        group flex flex-col h-full
        bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)]
        rounded-xl p-4
        transition-all duration-200
        hover:bg-[var(--theme-bg-input)] hover:border-[var(--theme-border-focus)] hover:shadow-sm
        cursor-pointer select-none
      "
      onClick={() => onLoad(scenario)}
    >
        {/* Header: Icon & Title */}
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColorClass}`}>
                <Icon size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-[var(--theme-text-primary)] truncate" title={scenario.title}>
                    {scenario.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-[var(--theme-text-tertiary)]">
                    <span>{messageCount} msgs</span>
                    {hasSystemPrompt && (
                        <>
                            <span className="w-0.5 h-0.5 rounded-full bg-current" />
                            <span className="flex items-center gap-0.5 text-[var(--theme-text-secondary)]">
                                <Sparkles size={8} /> Prompt
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Content Preview */}
        <div className="flex-grow mb-4">
            <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed line-clamp-3 opacity-80 group-hover:opacity-100 transition-opacity">
                {scenario.systemInstruction || (scenario.messages.length > 0 ? scenario.messages[0].content : 'No preview available')}
            </p>
        </div>

        {/* Footer Actions - Visible on Hover (Desktop) / Always (Mobile) */}
        <div className="flex items-center justify-end gap-1 pt-3 border-t border-[var(--theme-border-secondary)]/50 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
            {isSystem && onView && (
                <ActionButton onClick={onView} icon={Eye} label={t('scenarios_view_title', 'View')} scenario={scenario} />
            )}
            {!isSystem && onEdit && (
                <ActionButton onClick={onEdit} icon={Edit3} label={t('scenarios_edit_title')} scenario={scenario} />
            )}
            
            <ActionButton onClick={onDuplicate} icon={Copy} label={t('scenarios_duplicate_title')} scenario={scenario} />
            <ActionButton onClick={onExport} icon={Download} label={t('scenarios_export_single_title')} scenario={scenario} />

            {!isSystem && onDelete && (
                <>
                    <div className="w-px h-3 bg-[var(--theme-border-secondary)] mx-1" />
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(scenario.id); }}
                        className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded-md transition-colors"
                        title={t('scenarios_delete_title')}
                    >
                        <Trash2 size={14} />
                    </button>
                </>
            )}
        </div>
    </div>
  );
};

const ActionButton = ({ onClick, icon: Icon, label, scenario }: { onClick: (s: SavedScenario) => void, icon: any, label: string, scenario: SavedScenario }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(scenario); }}
        className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-colors"
        title={label}
    >
        <Icon size={14} />
    </button>
);
