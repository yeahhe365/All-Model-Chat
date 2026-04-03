
import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { formatShortcut, recordKeyCombination } from '../../../../utils/shortcutUtils';

interface ShortcutRecorderProps {
    value: string; // The current shortcut string (e.g. "mod+shift+p")
    defaultValue: string;
    onChange: (newValue: string) => void;
}

export const ShortcutRecorder: React.FC<ShortcutRecorderProps> = ({ value, defaultValue, onChange }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [tempKey, setTempKey] = useState<string | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const displayValue = tempKey !== null ? tempKey : (value || defaultValue);
    const formattedKeys = formatShortcut(displayValue);

    useEffect(() => {
        if (!isRecording) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent default browser actions while recording
            e.preventDefault();
            e.stopPropagation();

            // Allow Escape to cancel recording without saving
            if (e.key === 'Escape') {
                setIsRecording(false);
                setTempKey(null);
                return;
            }
            
            // Capture key combo
            // Use standard React synth event utility logic adapted for native event
            const combo = recordKeyCombination(e as any);
            
            if (combo) {
                setTempKey(combo);
                // End recording after a valid combo is pressed
                // Small delay to show the user what they pressed before locking it
                setTimeout(() => {
                    onChange(combo);
                    setIsRecording(false);
                    setTempKey(null);
                }, 150);
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            // Click outside cancels recording
            if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setIsRecording(false);
                setTempKey(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        window.addEventListener('mousedown', handleMouseDown);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('mousedown', handleMouseDown);
        };
    }, [isRecording, onChange]);

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(defaultValue);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    const hasChanged = value !== defaultValue;
    const isBound = !!displayValue;

    return (
        <div className="flex items-center gap-3 group/recorder relative">
            {/* Actions - visible on hover/focus or if actively recording/changed */}
            <div className={`flex items-center gap-1 transition-opacity duration-200 ${hasChanged || isRecording ? 'opacity-100' : 'opacity-0 group-hover/recorder:opacity-100 focus-within:opacity-100'}`}>
                {hasChanged && (
                    <button 
                        onClick={handleReset} 
                        className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                        title="Reset to default"
                        aria-label="Reset shortcut"
                    >
                        <RotateCcw size={12} />
                    </button>
                )}
                {isBound && (
                    <button 
                        onClick={handleClear}
                        className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                        title="Clear shortcut"
                        aria-label="Clear shortcut"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            <button
                ref={buttonRef}
                onClick={() => setIsRecording(true)}
                className={`
                    relative flex items-center justify-end min-h-[32px] px-2 rounded-lg transition-all duration-200 outline-none
                    focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)]
                    ${isRecording 
                        ? 'bg-[var(--theme-bg-accent)]/10 ring-1 ring-[var(--theme-bg-accent)] text-[var(--theme-text-link)] min-w-[100px] justify-center' 
                        : 'hover:bg-[var(--theme-bg-tertiary)]/50'
                    }
                `}
                title={isRecording ? "Press keys to record" : "Click to record shortcut"}
                aria-label={isRecording ? "Recording shortcut" : `Current shortcut: ${formattedKeys.join(' plus ')}`}
            >
                {isRecording ? (
                    <span className="text-xs font-medium animate-pulse whitespace-nowrap font-mono">
                        {tempKey ? formatShortcut(tempKey).join(' + ') : 'Recording...'}
                    </span>
                ) : (
                    isBound ? (
                        <div className="flex items-center gap-1.5">
                            {formattedKeys.map((k, i) => (
                                <kbd 
                                    key={i} 
                                    className="
                                        min-w-[20px] h-6 px-1.5 
                                        flex items-center justify-center 
                                        bg-[var(--theme-bg-primary)] 
                                        border border-[var(--theme-border-secondary)] 
                                        border-b-2
                                        rounded-[6px]
                                        text-[11px] font-sans font-medium text-[var(--theme-text-secondary)]
                                        shadow-sm
                                        select-none
                                    "
                                >
                                    {k}
                                </kbd>
                            ))}
                        </div>
                    ) : (
                        <span className="text-xs text-[var(--theme-text-tertiary)] italic px-2">None</span>
                    )
                )}
            </button>
        </div>
    );
};
