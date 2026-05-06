import React from 'react';
import { Mic, Square, Trash2, Check, Loader2, X } from 'lucide-react';
import { RecorderState } from '@/features/audio/useAudioRecorder';
import { useI18n } from '../../contexts/I18nContext';

interface RecorderControlsProps {
  viewState: RecorderState;
  isInitializing: boolean;
  isSaving: boolean;
  onStart?: () => void;
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
  onSave,
}) => {
  const { t } = useI18n();

  if (viewState === 'idle' && !onStart) {
    return null;
  }

  return (
    <div className="px-5 py-4 bg-[var(--theme-bg-primary)] flex justify-center gap-3">
      {/* Idle Controls */}
      {viewState === 'idle' && onStart && (
        <button
          onClick={onStart}
          disabled={isInitializing}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isInitializing ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
          {t('audioRecorder_startRecording')}
        </button>
      )}

      {/* Recording Controls */}
      {viewState === 'recording' && (
        <>
          <button
            onClick={onCancel}
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--theme-bg-tertiary)]/45 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
            title={t('audioRecorder_cancelRecording')}
            aria-label={t('audioRecorder_cancelRecording')}
          >
            <X size={20} />
          </button>
          <button
            onClick={onStop}
            className="h-11 px-5 flex items-center justify-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm transition-colors"
            title={t('audioRecorder_stopRecording')}
            aria-label={t('audioRecorder_stopRecording')}
          >
            <Square size={18} fill="currentColor" />
            <span className="text-sm font-medium">{t('audioRecorder_stopRecording')}</span>
          </button>
        </>
      )}

      {/* Review Controls */}
      {viewState === 'review' && (
        <>
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--theme-bg-tertiary)]/45 text-[var(--theme-text-danger)] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
            {t('audioRecorder_discard')}
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {isSaving ? t('audioRecorder_saving') : t('audioRecorder_saveRecording')}
          </button>
        </>
      )}
    </div>
  );
};
