
import React, { useMemo } from 'react';
import { translations } from '../../../utils/appUtils';
import { ShortcutMap, KeyDefinition } from '../../../types';
import { DEFAULT_SHORTCUTS } from '../../../constants/appConstants';
import { ShortcutRecorder } from './shortcuts/ShortcutRecorder';
import { RefreshCw, Command } from 'lucide-react';

interface ShortcutsSectionProps {
    customShortcuts?: ShortcutMap;
    onUpdateShortcut: (id: string, def: KeyDefinition) => void;
    onResetAll: () => void;
    t: (key: keyof typeof translations | string) => string;
}

const SHORTCUT_GROUPS = [
    {
        titleKey: 'shortcuts_general_title',
        keys: ['newChat', 'openLogs', 'togglePip', 'toggleFullscreen']
    },
    {
        titleKey: 'shortcuts_chat_input_title',
        keys: ['sendMessage', 'newLine', 'editLastMessage', 'cycleModels', 'slashCommands', 'toggleVoice', 'focusInput', 'clearChat']
    },
    {
        titleKey: 'shortcuts_global_title',
        keys: ['stopGeneration', 'saveConfirm', 'fileNavNext', 'fileNavPrev']
    }
];

// Helper to check deep equality of key definition
const isSameShortcut = (a: KeyDefinition, b: KeyDefinition) => {
    return (
        a.key === b.key &&
        !!a.mod === !!b.mod &&
        !!a.ctrl === !!b.ctrl &&
        !!a.alt === !!b.alt &&
        !!a.shift === !!b.shift &&
        !!a.meta === !!b.meta
    );
};

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = ({ 
    customShortcuts, 
    onUpdateShortcut, 
    onResetAll,
    t 
}) => {
    
    // Merge current with defaults to ensure all keys exist
    const shortcuts = useMemo(() => {
        return { ...DEFAULT_SHORTCUTS, ...customShortcuts };
    }, [customShortcuts]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-8 px-1">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--theme-border-secondary)]">
                <div className="space-y-1">
                     <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
                        <Command size={20} className="text-[var(--theme-text-link)]" />
                        {t('settingsTabShortcuts')}
                    </h3>
                    <p className="text-sm text-[var(--theme-text-secondary)] max-w-lg">
                        {t('shortcuts_description')}
                    </p>
                </div>
                <button
                    onClick={onResetAll}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--theme-text-secondary)] bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)] rounded-lg transition-colors shadow-sm active:translate-y-0.5"
                >
                    <RefreshCw size={14} />
                    <span>{t('shortcuts_reset_all')}</span>
                </button>
            </div>

            {/* Groups */}
            <div className="grid gap-8">
                {SHORTCUT_GROUPS.map(group => (
                    <div key={group.titleKey} className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] px-1">
                            {t(group.titleKey)}
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {group.keys.map(keyId => {
                                // Skip if keyId doesn't exist in defaults (e.g. removed feature)
                                if (!DEFAULT_SHORTCUTS[keyId]) return null;
                                
                                const currentDef = shortcuts[keyId];
                                const defaultDef = DEFAULT_SHORTCUTS[keyId];
                                const isDefault = isSameShortcut(currentDef, defaultDef);
                                
                                // Translation key construction
                                const labelKey = `shortcuts_${keyId.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`;

                                return (
                                    <div 
                                        key={keyId} 
                                        className="group flex items-center justify-between p-3 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)]/50 hover:border-[var(--theme-border-secondary)] transition-all hover:shadow-sm"
                                    >
                                        <span className="text-sm font-medium text-[var(--theme-text-primary)] truncate pr-4" title={t(labelKey, keyId)}>
                                            {t(labelKey, keyId)}
                                        </span>
                                        <ShortcutRecorder 
                                            shortcut={currentDef} 
                                            isDefault={isDefault}
                                            onChange={(newDef) => onUpdateShortcut(keyId, newDef)}
                                            onReset={() => onUpdateShortcut(keyId, defaultDef)}
                                            t={t}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
