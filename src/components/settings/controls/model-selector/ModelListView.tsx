import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { ApiMode, ModelOption } from '../../../../types';
import { getModelIcon } from '../../../shared/ModelPicker';
import { useI18n } from '../../../../contexts/I18nContext';
import { buildModelCatalog, filterModelCatalog, type ModelCatalogCategory } from '../../../../utils/modelCatalog';

interface ModelListViewProps {
  availableModels: ModelOption[];
  selectedModelId: string;
  selectedApiMode?: ApiMode;
  onSelectModel: (id: string, apiMode?: ApiMode) => void;
}

type ModelListSection = {
  entries: ReturnType<typeof filterModelCatalog>;
  key: string;
  providerKey?: ApiMode;
};

const getProviderSectionLabelKey = (providerKey: ApiMode): string => {
  if (providerKey === 'openai-compatible') {
    return 'modelPickerProviderOpenAICompatible';
  }

  return 'modelPickerProviderGemini';
};

export const ModelListView: React.FC<ModelListViewProps> = ({
  availableModels,
  selectedModelId,
  selectedApiMode,
  onSelectModel,
}) => {
  const { t } = useI18n();

  const catalog = useMemo(() => buildModelCatalog(availableModels), [availableModels]);
  const filteredEntries = useMemo(() => filterModelCatalog(catalog, ''), [catalog]);

  const sections = useMemo(() => {
    const hasProviderSections = filteredEntries.some((entry) => entry.model.apiMode);
    if (hasProviderSections) {
      const providerOrder: ApiMode[] = ['gemini-native', 'openai-compatible'];

      return providerOrder.reduce<ModelListSection[]>((nextSections, providerKey) => {
        const entries = filteredEntries.filter((entry) => entry.model.apiMode === providerKey);
        if (entries.length > 0) {
          nextSections.push({
            key: providerKey,
            providerKey,
            entries,
          });
        }

        return nextSections;
      }, []);
    }

    const pinned = filteredEntries.filter((entry) => entry.group === 'pinned');
    const standard = filteredEntries.filter((entry) => entry.group === 'standard');
    const categories: ModelCatalogCategory[] = ['text', 'live', 'tts', 'image', 'robotics', 'other'];
    const nextSections: ModelListSection[] = [];

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
          <div key={section.key} className="space-y-1" data-provider-section={section.providerKey}>
            {section.providerKey && (
              <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-text-tertiary)]">
                {t(getProviderSectionLabelKey(section.providerKey))}
              </div>
            )}
            {section.entries.map((entry) => {
              const isSelected =
                entry.id === selectedModelId &&
                (!selectedApiMode || !entry.model.apiMode || entry.model.apiMode === selectedApiMode);
              const optionKey = entry.model.apiMode ? `${entry.model.apiMode}:${entry.id}` : entry.id;

              return (
                <button
                  type="button"
                  key={optionKey}
                  data-testid={`settings-model-option-${entry.id}`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => onSelectModel(entry.id, entry.model.apiMode)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 text-sm rounded-xl border transition-colors text-left ${
                    isSelected
                      ? 'bg-[var(--theme-bg-accent)]/10 border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]'
                      : 'border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:border-[var(--theme-border-secondary)] hover:text-[var(--theme-text-primary)]'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 mt-0.5 ${isSelected ? 'text-[var(--theme-text-link)]' : 'opacity-70'}`}
                  >
                    {getModelIcon(entry.model)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium truncate ${isSelected ? 'text-[var(--theme-text-link)]' : ''}`}>
                        {entry.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--theme-text-tertiary)] font-mono truncate opacity-70">
                      {entry.id}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    {isSelected && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] text-[10px] font-bold shadow-sm border border-transparent">
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
