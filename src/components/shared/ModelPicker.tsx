import { useI18n } from '../../contexts/I18nContext';
/* eslint-disable react-refresh/only-export-components */
import React, { useMemo, useRef, useState } from 'react';
import { ModelOption } from '../../types';
import {
  Banana,
  Box,
  Image as ImageIcon,
  Sparkles,
  Check,
  AudioWaveform,
  Layers3,
  ScanEye,
  Speech,
} from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { isGeminiRoboticsModel } from '../../utils/modelHelpers';
import { getCachedModelCapabilities } from '../../stores/modelCapabilitiesStore';
import {
  buildModelCatalog,
  buildModelCatalogSections,
  filterModelCatalog,
  getModelProviderSectionLabelKey,
} from '../../utils/modelCatalog';

const MODEL_ICON_SIZE = 18;

export const getModelIcon = (model: ModelOption | undefined) => {
  if (!model) return <Box size={MODEL_ICON_SIZE} className="text-[var(--theme-text-tertiary)]" strokeWidth={1.5} />;
  const { id, isPinned } = model;
  const normalizedId = id.toLowerCase();
  const { isNativeAudioModel, isTtsModel, isRealImagenModel, isGemini3ImageModel, isFlashImageModel, isGemmaModel } =
    getCachedModelCapabilities(id);

  // Native Audio (Live)
  if (isNativeAudioModel)
    return (
      <AudioWaveform
        size={MODEL_ICON_SIZE}
        className="text-amber-500 dark:text-amber-400 flex-shrink-0"
        strokeWidth={1.5}
      />
    );

  if (isTtsModel)
    return (
      <Speech size={MODEL_ICON_SIZE} className="text-purple-500 dark:text-purple-400 flex-shrink-0" strokeWidth={1.5} />
    );
  if (isRealImagenModel)
    return (
      <ImageIcon size={MODEL_ICON_SIZE} className="text-rose-500 dark:text-rose-400 flex-shrink-0" strokeWidth={1.5} />
    );
  if (isGemini3ImageModel || isFlashImageModel)
    return (
      <Banana size={MODEL_ICON_SIZE} className="text-yellow-500 dark:text-yellow-400 flex-shrink-0" strokeWidth={1.5} />
    );
  if (isGeminiRoboticsModel(id))
    return (
      <ScanEye
        size={MODEL_ICON_SIZE}
        className="text-emerald-500 dark:text-emerald-400 flex-shrink-0"
        strokeWidth={1.5}
      />
    );
  if (isGemmaModel)
    return (
      <Layers3
        size={MODEL_ICON_SIZE}
        className="text-violet-500 dark:text-violet-400 flex-shrink-0"
        strokeWidth={1.5}
      />
    );

  // Google text models share the same chat icon in the picker.
  if (normalizedId.includes('gemini')) {
    return (
      <Sparkles size={MODEL_ICON_SIZE} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />
    );
  }

  if (isPinned)
    return (
      <Sparkles size={MODEL_ICON_SIZE} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />
    );
  return (
    <Box
      size={MODEL_ICON_SIZE}
      className="text-[var(--theme-text-tertiary)] opacity-70 flex-shrink-0"
      strokeWidth={1.5}
    />
  );
};

interface ModelPickerProps {
  models: ModelOption[];
  selectedId: string;
  onSelect: (modelId: string) => void;

  // Render props for the trigger button
  renderTrigger: (props: {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    selectedModel: ModelOption | undefined;
    ref: React.RefObject<HTMLDivElement>;
  }) => React.ReactNode;

  dropdownClassName?: string;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
  models,
  selectedId,
  onSelect,
  renderTrigger,
  dropdownClassName,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const catalog = useMemo(() => buildModelCatalog(models), [models]);
  const filteredEntries = useMemo(() => filterModelCatalog(catalog, ''), [catalog]);

  const selectedModel = models.find((m) => m.id === selectedId);

  const sections = useMemo(() => buildModelCatalogSections(filteredEntries), [filteredEntries]);

  const handleSelectModel = (modelId: string) => {
    onSelect(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {renderTrigger({
        isOpen,
        setIsOpen,
        selectedModel,
        ref: containerRef,
      })}

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-50 flex flex-col modal-enter-animation overflow-hidden ${dropdownClassName || 'w-full min-w-[280px] max-h-[300px]'}`}
        >
          {!models.length ? (
            <div className="p-4 text-center">
              <p className="text-xs text-[var(--theme-text-tertiary)] mt-2">{t('appNoModelsAvailable')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-y-auto custom-scrollbar p-1.5 flex-grow space-y-2" role="listbox">
                {sections.length === 0 ? (
                  <div className="px-3 py-5 text-center text-xs text-[var(--theme-text-tertiary)]">
                    {t('modelPickerNoResults')}
                  </div>
                ) : (
                  sections.map((section) => (
                    <div key={section.key} className="space-y-1" data-provider-section={section.providerKey}>
                      {section.providerKey && (
                        <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-text-tertiary)]">
                          {t(getModelProviderSectionLabelKey(section.providerKey))}
                        </div>
                      )}
                      {section.entries.map((entry) => {
                        const isSelected = entry.id === selectedId;

                        return (
                          <button
                            key={entry.id}
                            id={`model-picker-option-${entry.id}`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelectModel(entry.id)}
                            className={`group w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-start justify-between transition-colors cursor-pointer outline-none border ${
                              isSelected
                                ? 'bg-[var(--theme-bg-tertiary)]/60 border-[var(--theme-border-secondary)]'
                                : 'bg-transparent border-transparent hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)]'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-grow overflow-hidden">
                              <div className="mt-0.5 flex-shrink-0">{getModelIcon(entry.model)}</div>
                              <div className="min-w-0 flex-grow">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`truncate ${isSelected ? 'text-[var(--theme-text-link)] font-semibold' : 'text-[var(--theme-text-primary)]'}`}
                                    title={entry.name}
                                  >
                                    {entry.name}
                                  </span>
                                </div>
                                <div className="mt-1 truncate font-mono text-[10px] text-[var(--theme-text-tertiary)]">
                                  {entry.id}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0 pl-3 pt-0.5">
                              {isSelected && (
                                <Check size={14} className="text-[var(--theme-text-link)]" strokeWidth={1.5} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
