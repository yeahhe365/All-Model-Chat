import React, { useState, useEffect } from 'react';
import { Plus, RotateCcw, Check } from 'lucide-react';
import { ModelOption } from '../../../../types';
import { ModelListEditorRow } from './ModelListEditorRow';
import { useI18n } from '../../../../contexts/I18nContext';

interface ModelListEditorProps {
  availableModels: ModelOption[];
  defaultModels?: ModelOption[];
  onSave: (models: ModelOption[]) => void;
  setIsEditingList: (value: boolean) => void;
}

type EditableModelField = 'id' | 'name' | 'isPinned';
type EditableModelRow = ModelOption & { _rowId: string };

const createRowId = () => `model-row-${Math.random().toString(36).slice(2, 10)}`;
const toEditableRows = (models: ModelOption[]): EditableModelRow[] =>
  models.map((model) => ({
    ...model,
    _rowId: createRowId(),
  }));

export const ModelListEditor: React.FC<ModelListEditorProps> = ({
  availableModels,
  defaultModels,
  onSave,
  setIsEditingList,
}) => {
  const { t } = useI18n();
  const [tempModels, setTempModels] = useState<EditableModelRow[]>(() => toEditableRows(availableModels));
  const [validationMessage, setValidationMessage] = useState('');

  // Sync when entering edit mode (mounting) or parent updates
  useEffect(() => {
    setTempModels(toEditableRows(availableModels));
    setValidationMessage('');
  }, [availableModels]);

  const handleUpdateTempModel = (index: number, field: EditableModelField, value: ModelOption[EditableModelField]) => {
    const updated = [...tempModels];
    updated[index] = { ...updated[index], [field]: value };
    setTempModels(updated);
    setValidationMessage('');
  };

  const handleDeleteModel = (index: number) => {
    setTempModels((prev) => prev.filter((_, i) => i !== index));
    setValidationMessage('');
  };

  const handleAddModel = () => {
    setTempModels((prev) => [...prev, { id: '', name: '', isPinned: false, _rowId: createRowId() }]);
    setValidationMessage('');
  };

  const handleResetDefaults = async () => {
    if (window.confirm(t('settingsResetModelListConfirm'))) {
      if (defaultModels) {
        setTempModels(toEditableRows(defaultModels));
        return;
      }

      const { getDefaultModelOptions } = await import('../../../../utils/defaultModelOptions');
      setTempModels(toEditableRows(getDefaultModelOptions()));
    }
  };

  const handleSaveList = () => {
    const validModels = tempModels
      .map((model) => ({
        id: model.id.trim(),
        name: model.name.trim(),
        isPinned: !!model.isPinned,
      }))
      .filter((model) => model.id !== '');

    if (validModels.length === 0) {
      setValidationMessage(t('settingsModelListRequiresModel'));
      return;
    }

    const ids = validModels.map((model) => model.id);
    if (new Set(ids).size !== ids.length) {
      setValidationMessage(t('settingsModelListDuplicateIds'));
      return;
    }

    const refinedModels = validModels.map((m) => ({
      ...m,
      name: m.name || m.id,
    }));
    setValidationMessage('');
    onSave(refinedModels);
    setIsEditingList(false);
  };

  return (
    <div className="border border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-input)]/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-2">
        {tempModels.map((model, idx) => (
          <ModelListEditorRow
            key={model._rowId}
            model={model}
            index={idx}
            onUpdate={handleUpdateTempModel}
            onDelete={handleDeleteModel}
          />
        ))}

        {tempModels.length === 0 && (
          <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)] italic">
            {t('settingsNoModelsInList')}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--theme-border-secondary)] p-3 bg-[var(--theme-bg-secondary)]/30 flex items-center justify-between gap-2">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex gap-2">
            <button
              onClick={handleAddModel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-primary)] bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            >
              <Plus size={14} /> {t('settingsAddModel')}
            </button>
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded transition-colors"
            >
              <RotateCcw size={14} /> {t('settingsResetModelList')}
            </button>
          </div>
          {validationMessage && <p className="text-xs text-[var(--theme-text-danger)]">{validationMessage}</p>}
        </div>

        <button
          onClick={handleSaveList}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-[var(--theme-text-accent)] bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] rounded transition-colors shadow-sm"
        >
          <Check size={14} /> {t('settingsSaveModelList')}
        </button>
      </div>
    </div>
  );
};
