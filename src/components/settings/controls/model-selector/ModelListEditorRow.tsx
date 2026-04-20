import React from 'react';
import { Trash2 } from 'lucide-react';
import { ModelOption } from '../../../../types';
import { getModelIcon } from '../../../shared/ModelPicker';
import { useI18n } from '../../../../contexts/I18nContext';

interface ModelListEditorRowProps {
    model: ModelOption;
    index: number;
    onUpdate: (index: number, field: 'id' | 'name' | 'isPinned', value: string | boolean) => void;
    onDelete: (index: number) => void;
}

export const ModelListEditorRow: React.FC<ModelListEditorRowProps> = ({ model, index, onUpdate, onDelete }) => {
    const { t } = useI18n();

    return (
        <div className="flex items-center gap-2 group">
            <div className="w-8 flex justify-center text-[var(--theme-text-tertiary)]">
                {getModelIcon(model)}
            </div>
            <input
                type="text"
                value={model.id}
                onChange={(e) => onUpdate(index, 'id', e.target.value)}
                placeholder={t('settingsModelIdPlaceholder')}
                className="flex-1 min-w-0 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded px-2 py-1.5 text-xs text-[var(--theme-text-primary)] focus:border-[var(--theme-border-focus)] outline-none font-mono"
            />
            <input
                type="text"
                value={model.name}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                placeholder={t('settingsModelNamePlaceholder')}
                className="flex-1 min-w-0 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded px-2 py-1.5 text-xs text-[var(--theme-text-primary)] focus:border-[var(--theme-border-focus)] outline-none"
            />
            <button
                onClick={() => onDelete(index)}
                className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded transition-colors"
                title={t('settingsRemoveModel')}
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};
