import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { ModelOption } from '../../../../types';
import { getModelIcon } from '../../../shared/ModelPicker';
import { useI18n } from '../../../../contexts/I18nContext';
import { buildModelCatalog, filterModelCatalog, type ModelCatalogCategory } from '../../../../utils/modelCatalog';

interface ModelListViewProps {
    availableModels: ModelOption[];
    selectedModelId: string;
    onSelectModel: (id: string) => void;
}

export const ModelListView: React.FC<ModelListViewProps> = ({ availableModels, selectedModelId, onSelectModel }) => {
    const { t } = useI18n();

    const catalog = useMemo(() => buildModelCatalog(availableModels), [availableModels]);
    const filteredEntries = useMemo(() => filterModelCatalog(catalog, ''), [catalog]);

    const sections = useMemo(() => {
        const pinned = filteredEntries.filter((entry) => entry.group === 'pinned');
        const standard = filteredEntries.filter((entry) => entry.group === 'standard');
        const categories: ModelCatalogCategory[] = ['text', 'live', 'tts', 'image', 'robotics', 'other'];
        const nextSections: Array<{ key: string; entries: typeof filteredEntries }> = [];

        if (pinned.length > 0) {
            nextSections.push({ key: 'pinned', entries: pinned });
        }

        categories.forEach((category) => {
            const entries = standard.filter((entry) => entry.category === category);
            if (entries.length > 0) {
                nextSections.push({ key: category, entries });
            }
        });

        return nextSections;
    }, [filteredEntries]);

    return (
        <div className="border border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-input)]/30 overflow-hidden">
            <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5 space-y-2">
                {sections.map((section) => (
                    <div key={section.key} className="space-y-1">
                        {section.entries.map((entry) => {
                            const isSelected = entry.id === selectedModelId;

                            return (
                                <button
                                    type="button"
                                    key={entry.id}
                                    data-testid={`settings-model-option-${entry.id}`}
                                    onPointerDown={(event) => {
                                        event.preventDefault();
                                    }}
                                    onClick={() => onSelectModel(entry.id)}
                                    className={`w-full flex items-start gap-3 px-3 py-2.5 text-sm rounded-xl border transition-colors text-left ${
                                        isSelected
                                            ? 'bg-[var(--theme-bg-accent)]/10 border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]'
                                            : 'border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:border-[var(--theme-border-secondary)] hover:text-[var(--theme-text-primary)]'
                                    }`}
                                >
                                    <div className={`flex-shrink-0 mt-0.5 ${isSelected ? 'text-[var(--theme-text-link)]' : 'opacity-70'}`}>
                                        {getModelIcon(entry.model)}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-medium truncate ${isSelected ? 'text-[var(--theme-text-link)]' : ''}`}>{entry.name}</span>
                                        </div>
                                        <div className="text-[10px] text-[var(--theme-text-tertiary)] font-mono truncate opacity-70">{entry.id}</div>
                                    </div>

                                    <div className="flex-shrink-0 ml-2">
                                        {isSelected && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] text-[10px] font-bold shadow-sm border border-transparent animate-in fade-in zoom-in duration-200">
                                                <Check size={11} strokeWidth={3} />
                                                <span>{t('settingsActiveModel')}</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ))}
                {availableModels.length === 0 && (
                    <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)] italic">
                        {t('chatBehavior_model_noModels')}
                    </div>
                )}
                {availableModels.length > 0 && sections.length === 0 && (
                    <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)] italic">
                        {t('modelPickerNoResults')}
                    </div>
                )}
            </div>
        </div>
    );
};
