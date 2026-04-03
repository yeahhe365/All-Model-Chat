
import React, { useState } from 'react';
import { Mic, X, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { AudioPlayer } from '../shared/AudioPlayer';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { AudioVisualizer } from '../recorder/AudioVisualizer';
import { RecorderControls } from '../recorder/RecorderControls';

interface AudioRecorderProps {
  onRecord: (file: File) => Promise<void>;
  onCancel: () => void;
  isSystemAudioRecordingEnabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecord, onCancel, isSystemAudioRecordingEnabled }) => {
    const {
        viewState,
        isInitializing,
        recordingTime,
        audioBlob,
        audioUrl,
        error,
        stream,
        startRecording,
        stopRecording,
        discardRecording
    } = useAudioRecorder();

    const [isSaving, setIsSaving] = useState(false);

    const handleStart = () => {
        startRecording({ captureSystemAudio: isSystemAudioRecordingEnabled });
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
            alert("Failed to save recording.");
            setIsSaving(false);
        }
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
            backdropClassName="bg-black/80 backdrop-blur-sm"
            contentClassName="w-full max-w-md bg-[var(--theme-bg-secondary)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--theme-border-primary)]"
            noPadding
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]">
                <h2 className="text-base font-semibold text-[var(--theme-text-primary)]">
                    {viewState === 'review' ? 'Preview Recording' : 'Voice Recorder'}
                </h2>
                <button onClick={onCancel} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Content Body */}
            <div className="p-6 flex flex-col items-center justify-center min-h-[220px]">
                
                {error && (
                    <div className="flex flex-col items-center text-[var(--theme-text-danger)] gap-2 mb-4 text-center animate-in fade-in zoom-in duration-200">
                        <AlertCircle size={32} />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* State: Idle / Initializing */}
                {viewState === 'idle' && !error && (
                    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[var(--theme-bg-accent)]/20 rounded-full animate-ping"></div>
                            <div className="relative w-20 h-20 bg-[var(--theme-bg-accent)]/10 rounded-full flex items-center justify-center text-[var(--theme-text-link)]">
                                {isInitializing ? (
                                    <Loader2 size={40} className="animate-spin" />
                                ) : (
                                    <Mic size={40} />
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-[var(--theme-text-secondary)]">
                            {isInitializing ? "Accessing microphone..." : "Ready to record"}
                        </p>
                        {isSystemAudioRecordingEnabled && !isInitializing && (
                            <p className="text-xs text-[var(--theme-text-tertiary)] bg-[var(--theme-bg-tertiary)]/50 px-2 py-1 rounded">
                                System audio recording enabled
                            </p>
                        )}
                    </div>
                )}

                {/* State: Recording */}
                {viewState === 'recording' && (
                    <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="font-mono text-5xl font-light text-[var(--theme-text-primary)] tabular-nums tracking-wider">
                            {formatTime(recordingTime)}
                        </div>

                        <AudioVisualizer stream={stream} />

                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-widest animate-pulse">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Recording
                        </div>
                    </div>
                )}

                {/* State: Review */}
                {viewState === 'review' && audioUrl && (
                    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex flex-col items-center mb-6">
                            <div className="text-xs text-[var(--theme-text-tertiary)] mb-1 uppercase tracking-wide">Total Duration</div>
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
                onStart={handleStart}
                onStop={stopRecording}
                onCancel={onCancel}
                onDiscard={discardRecording}
                onSave={handleSave}
            />
        </Modal>
    );
};