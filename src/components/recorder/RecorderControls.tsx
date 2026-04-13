
import React from 'react';
import { Mic, Square, Trash2, Check, Loader2, X } from 'lucide-react';
import { RecorderState } from '../../hooks/useAudioRecorder';

interface RecorderControlsProps {
    viewState: RecorderState;
    isInitializing: boolean;
    isSaving: boolean;
    onStart: () => void;
    onStop: () => void;
    onCancel: () => void;
    onDiscard: () => void;
    onSave: () => void;
}

export const RecorderControls: React.FC<RecorderControlsProps> = ({
    viewState,
    isInitializing,
    isSaving,
    onStart,
    onStop,
    onCancel,
    onDiscard,
    onSave
}) => {
    return (
        <div className="px-6 py-5 bg-[var(--theme-bg-tertiary)]/30 border-t border-[var(--theme-border-secondary)] flex justify-center gap-6">
            
            {/* Idle Controls */}
            {viewState === 'idle' && (
                <button 
                    onClick={onStart} 
                    disabled={isInitializing}
                    className="flex items-center gap-2 px-8 py-3 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-full font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isInitializing ? <Loader2 size={20} className="animate-spin"/> : <Mic size={20} />}
                    Start Recording
                </button>
            )}

            {/* Recording Controls */}
            {viewState === 'recording' && (
                <>
                    <button 
                        onClick={onCancel}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors border border-[var(--theme-border-secondary)]"
                        title="Cancel"
                    >
                        <X size={20} />
                    </button>
                    <button 
                        onClick={onStop} 
                        className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/30 transition-all hover:scale-105 active:scale-95 animate-pulse"
                        title="Stop Recording"
                    >
                        <Square size={24} fill="currentColor" />
                    </button>
                    <div className="w-12 h-12"></div> {/* Spacer */}
                </>
            )}

            {/* Review Controls */}
            {viewState === 'review' && (
                <>
                    <button 
                        onClick={onDiscard}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--theme-bg-input)] text-[var(--theme-text-danger)] border border-[var(--theme-border-secondary)] hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-900/30 transition-colors disabled:opacity-50"
                    >
                        <Trash2 size={18} />
                        Discard
                    </button>
                    <button 
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] font-medium shadow-md transition-all hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        {isSaving ? 'Saving...' : 'Save Recording'}
                    </button>
                </>
            )}
        </div>
    );
};
