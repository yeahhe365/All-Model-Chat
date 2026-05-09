import React, { useState } from 'react';
import { Mic, X, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { AudioPlayer } from '../shared/AudioPlayer';
import { useAudioRecorder } from '@/features/audio/useAudioRecorder';
import { SYSTEM_AUDIO_CAPTURE_FAILED_WARNING, SYSTEM_AUDIO_NOT_SHARED_WARNING } from '@/features/audio/audioProcessing';
import { AudioVisualizer } from '../recorder/AudioVisualizer';
import { RecorderControls } from '../recorder/RecorderControls';
import { FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS, MODAL_CLOSE_BUTTON_CLASS } from '../../constants/appConstants';
import { useI18n } from '../../contexts/I18nContext';

interface AudioRecorderProps {
  onRecord: (file: File) => Promise<void>;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecord, onCancel }) => {
  const { t } = useI18n();
  const {
    viewState,
    isInitializing,
    recordingTime,
    audioBlob,
    audioUrl,
    error,
    systemAudioWarning,
    stream,
    status,
    startRecording,
    stopRecording,
    discardRecording,
  } = useAudioRecorder();

  const [isSaving, setIsSaving] = useState(false);

  const handleStartMicrophone = () => {
    startRecording({ captureSystemAudio: false });
  };

  const handleStartSystemAudio = () => {
    startRecording({ captureSystemAudio: true });
  };

  const handleSave = async () => {
    if (!audioBlob) return;
    setIsSaving(true);
    try {
      const fileName = `recording-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.webm`;
      const file = new File([audioBlob], fileName, { type: 'audio/webm' });
      await onRecord(file);
    } catch (e) {
      console.error(e);
      alert(t('audioRecorder_failedToSave'));
      setIsSaving(false);
    }
  };

  const getSystemAudioWarningText = (warning: string) => {
    if (warning === SYSTEM_AUDIO_NOT_SHARED_WARNING) {
      return t('audioRecorder_systemAudioNotSharedWarning');
    }
    if (warning === SYSTEM_AUDIO_CAPTURE_FAILED_WARNING) {
      return t('audioRecorder_systemAudioCaptureFailedWarning');
    }
    return warning;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      contentClassName="w-full max-w-md bg-[var(--theme-bg-primary)] rounded-xl shadow-2xl overflow-hidden"
      noPadding
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-[var(--theme-bg-primary)]">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--theme-text-primary)]">
          <Mic size={20} className="text-[var(--theme-text-link)]" />
          {viewState === 'review' ? t('audioRecorder_previewTitle') : t('audioRecorder_title')}
        </h2>
        <button onClick={onCancel} aria-label={t('close')} className={MODAL_CLOSE_BUTTON_CLASS}>
          <X size={20} />
        </button>
      </div>

      {/* Content Body */}
      <div className="px-5 pb-5 pt-2 space-y-4">
        {error && (
          <div className="flex flex-col items-center text-[var(--theme-text-danger)] gap-2 mb-4 text-center">
            <AlertCircle size={32} />
            <p className="text-sm">{error}</p>
          </div>
        )}
        {systemAudioWarning && !error && (
          <div className="mb-4 w-full rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {getSystemAudioWarningText(systemAudioWarning)}
          </div>
        )}

        {/* State: Idle / Initializing */}
        {(viewState === 'idle' || (viewState === 'recording' && status !== 'recording')) && !error && (
          <div className="rounded-xl bg-[var(--theme-bg-tertiary)]/35 p-2">
            {isInitializing && (
              <div className="px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Loader2 size={15} className="shrink-0 animate-spin text-[var(--theme-text-link)]" />
                  <p className="text-sm font-medium text-[var(--theme-text-primary)]">
                    {t('audioRecorder_accessingMicrophone')}
                  </p>
                </div>
              </div>
            )}
            {!isInitializing && (
              <div className="grid grid-cols-1 gap-1">
                <button
                  type="button"
                  onClick={handleStartMicrophone}
                  className={`group flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[var(--theme-text-primary)] transition-colors hover:bg-[var(--theme-bg-primary)]/80 ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{t('audioRecorder_recordMicrophone')}</span>
                    <span className="text-xs text-[var(--theme-text-tertiary)]">
                      {t('audioRecorder_microphoneOnly')}
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-[var(--theme-text-tertiary)] opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </button>
                <button
                  type="button"
                  onClick={handleStartSystemAudio}
                  className={`group flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[var(--theme-text-primary)] transition-colors hover:bg-[var(--theme-bg-primary)]/80 ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{t('audioRecorder_recordSystemAudio')}</span>
                    <span className="text-xs text-[var(--theme-text-tertiary)]">
                      {t('audioRecorder_systemAudioAndMic')}
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-[var(--theme-text-tertiary)] opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </button>
                <p className="px-3 pb-1.5 pt-1 text-xs leading-5 text-[var(--theme-text-tertiary)]">
                  {t('audioRecorder_browserPermissionRequired')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* State: Recording */}
        {viewState === 'recording' && (
          <div className="w-full flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="font-mono text-4xl font-medium text-[var(--theme-text-primary)] tabular-nums tracking-wider">
              {formatTime(recordingTime)}
            </div>

            <AudioVisualizer stream={stream} />

            <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-widest">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {t('audioRecorder_recordingStatus')}
            </div>
          </div>
        )}

        {/* State: Review */}
        {viewState === 'review' && audioUrl && (
          <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center mb-6">
              <div className="text-xs text-[var(--theme-text-tertiary)] mb-1 uppercase tracking-wide">
                {t('audioRecorder_totalDuration')}
              </div>
              <div className="text-3xl font-mono text-[var(--theme-text-primary)]">{formatTime(recordingTime)}</div>
            </div>
            <AudioPlayer src={audioUrl} className="w-full" />
          </div>
        )}
      </div>

      {/* Controls */}
      <RecorderControls
        viewState={viewState}
        isInitializing={isInitializing}
        isSaving={isSaving}
        onStop={stopRecording}
        onCancel={onCancel}
        onDiscard={discardRecording}
        onSave={handleSave}
      />
    </Modal>
  );
};
