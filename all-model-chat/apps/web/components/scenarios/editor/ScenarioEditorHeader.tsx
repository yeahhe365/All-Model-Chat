
import React from 'react';
import { ChevronLeft, Settings2, Save } from 'lucide-react';
import { translations } from '../../../utils/appUtils';

interface ScenarioEditorHeaderProps {
    title: string;
    setTitle: (title: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onOpenSystemPrompt: () => void;
    isSaveDisabled: boolean;
    readOnly: boolean;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioEditorHeader: React.FC<ScenarioEditorHeaderProps> = ({
    title,
    setTitle,
    onSave,
    onCancel,
    onOpenSystemPrompt,
    isSaveDisabled,
    readOnly,
    t
}) => {
    return (
        <div className="bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-secondary)] p-3 sm:p-4 flex-shrink-0 z-10">
            <div className="flex items-center gap-3 sm:gap-4">
                <button 
                    onClick={onCancel}
                    className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] px-3 py-1.5 rounded-lg transition-colors"
                >
                    <ChevronLeft size={16} /> Back
                </button>
                <div className="hidden md:block h-6 w-px bg-[var(--theme-border-secondary)]"></div>
                
                <input
                    type="text"
                    value={title}
                    onChange={(e) => !readOnly && setTitle(e.target.value)}
                    placeholder={t('scenarios_editor_title_placeholder', 'Scenario Title')}
                    className="flex-1 bg-transparent text-lg sm:text-xl font-bold text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] outline-none min-w-0"
                    // Auto-focus logic handled by parent or just removed for simplicity as specific field auto-focus can be annoying
                    readOnly={readOnly}
                />
                
                {/* Mobile System Prompt Trigger */}
                <button
                    onClick={onOpenSystemPrompt}
                    className="md:hidden p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                    title={t('scenarios_system_prompt_label')}
                >
                    <Settings2 size={20} />
                </button>

                {!readOnly && (
                    <button 
                        onClick={onSave} 
                        disabled={isSaveDisabled} 
                        className="px-3 sm:px-5 py-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
                    >
                        <Save size={16} strokeWidth={2.5} /> 
                        <span className="hidden sm:inline">{t('save')}</span>
                    </button>
                )}
            </div>
        </div>
    );
};
