
import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { translations } from '../../../utils/translations';
import { SHORTCUT_REGISTRY, DEFAULT_SHORTCUTS } from '../../../constants/shortcuts';
import { AppSettings, ModelOption } from '../../../types';
import { ShortcutRecorder } from './shortcuts/ShortcutRecorder';
import { getQuickSwitchModelIds, getTabCycleModelIds } from '../../../utils/modelCatalog';

interface ShortcutsSectionProps {
    currentSettings?: AppSettings;
    availableModels?: ModelOption[];
    onUpdateSettings?: (settings: Partial<AppSettings>) => void;
    t: (key: keyof typeof translations | string) => string;
}

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = ({
    currentSettings,
    availableModels = [],
    onUpdateSettings,
    t,
}) => {
    const [isCycleModelsExpanded, setIsCycleModelsExpanded] = useState(false);
    
    // Group shortcuts by category
    const groupedShortcuts = useMemo(() => {
        const groups: Record<string, typeof SHORTCUT_REGISTRY> = {};
        SHORTCUT_REGISTRY.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, []);

    const categoryTitles: Record<string, string> = {
        general: 'shortcuts_general_title',
        input: 'shortcuts_chat_input_title',
        global: 'shortcuts_global_title'
    };

    const handleShortcutChange = useCallback((id: string, newKey: string) => {
        if (!currentSettings || !onUpdateSettings) return;
        
        const updatedShortcuts = { ...currentSettings.customShortcuts };
        
        if (newKey === DEFAULT_SHORTCUTS[id]) {
            // If setting back to default, remove from custom map to keep it clean
            delete updatedShortcuts[id];
        } else {
            updatedShortcuts[id] = newKey;
        }

        onUpdateSettings({ customShortcuts: updatedShortcuts });
    }, [currentSettings, onUpdateSettings]);

    const orderedCycleModels = useMemo(() => {
        const cycleIds = getQuickSwitchModelIds(availableModels);
        const modelMap = new Map(availableModels.map((model) => [model.id, model]));
        return cycleIds
            .map((id) => modelMap.get(id))
            .filter((model): model is ModelOption => !!model);
    }, [availableModels]);

    const effectiveTabCycleIds = useMemo(
        () => getTabCycleModelIds(availableModels, currentSettings?.tabModelCycleIds),
        [availableModels, currentSettings?.tabModelCycleIds],
    );

    const cycleSummary = useMemo(
        () => t('shortcuts_cycle_models_scope_summary').replace('{count}', String(effectiveTabCycleIds.length)),
        [effectiveTabCycleIds.length, t],
    );

    const handleTabCycleModelToggle = useCallback((modelId: string) => {
        if (!currentSettings || !onUpdateSettings) return;

        const isSelected = effectiveTabCycleIds.includes(modelId);
        if (isSelected && effectiveTabCycleIds.length === 1) {
            return;
        }

        const nextIds = isSelected
            ? effectiveTabCycleIds.filter((id) => id !== modelId)
            : orderedCycleModels
                .map((model) => model.id)
                .filter((id) => effectiveTabCycleIds.includes(id) || id === modelId);

        onUpdateSettings({
            tabModelCycleIds: nextIds.length === orderedCycleModels.length ? undefined : nextIds,
        });
    }, [currentSettings, effectiveTabCycleIds, onUpdateSettings, orderedCycleModels]);

    // Read-only mode fallback if props missing (e.g. during refactor transition)
    if (!currentSettings || !onUpdateSettings) {
        return <div className="p-4 text-center text-[var(--theme-text-tertiary)]">{t('shortcuts_unavailable')}</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {Object.entries(groupedShortcuts).map(([category, items]) => (
                <div key={category} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-3 border-b border-[var(--theme-border-secondary)]/50 pb-2">
                        {t(categoryTitles[category] || category)}
                    </h4>
                    
                    <div className="space-y-1">
                        {items.map(item => {
                            const customKey = currentSettings.customShortcuts?.[item.id];
                            const effectiveKey = customKey !== undefined ? customKey : item.defaultKey;

                            return (
                                <div key={item.id} className="py-2 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-[var(--theme-text-secondary)] font-medium group-hover:text-[var(--theme-text-primary)] transition-colors">
                                                {t(item.labelKey)}
                                            </span>
                                        </div>
                                        <ShortcutRecorder 
                                            value={effectiveKey} 
                                            defaultValue={item.defaultKey}
                                            onChange={(val) => handleShortcutChange(item.id, val)}
                                        />
                                    </div>

                                    {item.id === 'input.cycleModels' && (
                                        <div className="mt-3 rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)]/30 p-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsCycleModelsExpanded((prev) => !prev)}
                                                aria-expanded={isCycleModelsExpanded}
                                                aria-label={t('shortcuts_cycle_models_scope_toggle_aria')}
                                                className="flex w-full items-center justify-between gap-3 text-left"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                                                        {t('shortcuts_cycle_models_scope_title')}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-[var(--theme-text-tertiary)]">
                                                        {cycleSummary}
                                                    </span>
                                                </span>
                                                <ChevronDown
                                                    size={16}
                                                    className={`flex-shrink-0 text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isCycleModelsExpanded ? 'rotate-180' : ''}`}
                                                    strokeWidth={1.75}
                                                />
                                            </button>

                                            {isCycleModelsExpanded && (
                                                <div className="mt-3 border-t border-[var(--theme-border-secondary)]/60 pt-3">
                                                    <p className="mb-3 text-xs text-[var(--theme-text-tertiary)] leading-relaxed">
                                                        {t('shortcuts_cycle_models_scope_hint')}
                                                    </p>

                                                    {orderedCycleModels.length === 0 ? (
                                                        <div className="text-xs text-[var(--theme-text-tertiary)] italic">
                                                            {t('shortcuts_cycle_models_scope_empty')}
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-2 sm:grid-cols-2">
                                                            {orderedCycleModels.map((model) => {
                                                                const isSelected = effectiveTabCycleIds.includes(model.id);
                                                                const isLocked = isSelected && effectiveTabCycleIds.length === 1;

                                                                return (
                                                                    <label
                                                                        key={model.id}
                                                                        className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                                                                            isSelected
                                                                                ? 'border-[var(--theme-border-focus)] bg-[var(--theme-bg-accent)]/10'
                                                                                : 'border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]/40 hover:border-[var(--theme-border-focus)]/50'
                                                                        } ${isLocked ? 'opacity-80' : ''}`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            disabled={isLocked}
                                                                            onChange={() => handleTabCycleModelToggle(model.id)}
                                                                            aria-label={`${t('shortcuts_cycle_models_scope_model_aria')}: ${model.name}`}
                                                                            className="mt-0.5 h-4 w-4 rounded border-[var(--theme-border-secondary)] text-[var(--theme-text-link)] focus:ring-[var(--theme-border-focus)]"
                                                                        />
                                                                        <span className="min-w-0 flex-1">
                                                                            <span className={`block text-sm font-medium ${isSelected ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}>
                                                                                {model.name}
                                                                            </span>
                                                                            <span className="block truncate font-mono text-[10px] text-[var(--theme-text-tertiary)]">
                                                                                {model.id}
                                                                            </span>
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
