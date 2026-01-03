
import React, { useState, useEffect, useRef } from 'react';
import { KeyDefinition } from '../../../../types';
import { formatShortcut } from '../../../../utils/shortcutUtils';
import { RotateCcw, Keyboard } from 'lucide-react';
import { translations } from '../../../../utils/appUtils';

interface ShortcutRecorderProps {
    shortcut: KeyDefinition;
    onChange: (newShortcut: KeyDefinition) => void;
    onReset: () => void;
    isDefault: boolean;
    t: (key: keyof typeof translations | string) => string;
}

export const ShortcutRecorder: React.FC<ShortcutRecorderProps> = ({ shortcut, onChange, onReset, isDefault, t }) => {
    const [isRecording, setIsRecording] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isRecording) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore standalone modifier presses (wait for the combo)
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
                return;
            }

            // Cancel on Escape if not combined with modifiers
            if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
                setIsRecording(false);
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            
            const newDef: KeyDefinition = { 
                key: e.key 
            };

            if (e.altKey) newDef.alt = true;
            if (e.shiftKey) newDef.shift = true;

            // Smart Modifier Logic:
            if (isMac) {
                if (e.metaKey) newDef.mod = true; // Cmd -> Mod
                if (e.ctrlKey) newDef.ctrl = true; // Explicit Ctrl
            } else {
                if (e.ctrlKey) newDef.mod = true; // Ctrl -> Mod
                if (e.metaKey) newDef.meta = true; // Win -> Meta
            }

            onChange(newDef);
            setIsRecording(false);
        };

        window.addEventListener('keydown', handleKeyDown, true);
        
        const handleBlur = (e: MouseEvent) => {
             if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                 setIsRecording(false);
             }
        };
        window.addEventListener('mousedown', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('mousedown', handleBlur);
        };
    }, [isRecording, onChange]);

    const displayString = formatShortcut(shortcut);

    return (
        <div className="flex items-center gap-2 group/recorder">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsRecording(!isRecording);
                }}
                className={`
                    relative flex items-center justify-center min-w-[100px] h-8 px-3 rounded-md border-b-2 text-xs font-mono font-medium transition-all duration-200 outline-none select-none
                    ${isRecording 
                        ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse' 
                        : 'bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] hover:border-[var(--theme-text-tertiary)] active:border-b-0 active:translate-y-[2px] active:border-t-2 active:border-t-transparent'
                    }
                `}
                title={isRecording ? t('shortcuts_recording_placeholder') : t('shortcuts_click_to_record')}
            >
                {isRecording ? (
                    <span className="flex items-center gap-2">
                        <Keyboard size={12} /> {t('shortcuts_recording')}
                    </span>
                ) : (
                    <span>{displayString}</span>
                )}
            </button>

            {!isDefault && !isRecording && (
                <button
                    onClick={onReset}
                    className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 group-hover/recorder:opacity-100"
                    title={t('shortcuts_reset')}
                    aria-label={t('shortcuts_reset')}
                >
                    <RotateCcw size={14} />
                </button>
            )}
        </div>
    );
};
