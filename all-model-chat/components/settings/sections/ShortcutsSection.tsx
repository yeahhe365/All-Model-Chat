
import React, { useCallback, useMemo } from 'react';
import { translations } from '../../../utils/appUtils';
import { SHORTCUT_REGISTRY, DEFAULT_SHORTCUTS } from '../../../constants/shortcuts';
import { AppSettings } from '../../../types';
import { ShortcutRecorder } from './shortcuts/ShortcutRecorder';

interface ShortcutsSectionProps {
    currentSettings?: AppSettings;
    onUpdateSettings?: (settings: Partial<AppSettings>) => void;
    t: (key: keyof typeof translations | string) => string;
}

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = ({ currentSettings, onUpdateSettings, t }) => {
    
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

    // Read-only mode fallback if props missing (e.g. during refactor transition)
    if (!currentSettings || !onUpdateSettings) {
        return <div className="p-4 text-center text-[var(--theme-text-tertiary)]">Shortcut configuration unavailable.</div>;
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
                                <div key={item.id} className="flex items-center justify-between py-2 group">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-[var(--theme-text-secondary)] font-medium group-hover:text-[var(--theme-text-primary)] transition-colors">
                                            {t(item.labelKey as any)}
                                        </span>
                                    </div>
                                    <ShortcutRecorder 
                                        value={effectiveKey} 
                                        defaultValue={item.defaultKey}
                                        onChange={(val) => handleShortcutChange(item.id, val)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
