import React from 'react';
import { Bot, X, Pencil } from 'lucide-react';

interface ModelSelectorHeaderProps {
    isEditingList: boolean;
    setIsEditingList: (value: boolean) => void;
    t: (key: string) => string;
}

export const ModelSelectorHeader: React.FC<ModelSelectorHeaderProps> = ({ isEditingList, setIsEditingList, t }) => (
    <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
            <Bot size={14} strokeWidth={1.5} /> {t('settingsModelList_manage')}
        </h4>
        
        <button 
            onClick={() => setIsEditingList(!isEditingList)} 
            className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${isEditingList ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]'}`}
        >
            {isEditingList ? <X size={12} /> : <Pencil size={12} />}
            {isEditingList ? t('settingsModelList_cancel_edit') : t('settingsModelList_edit')}
        </button>
    </div>
);
