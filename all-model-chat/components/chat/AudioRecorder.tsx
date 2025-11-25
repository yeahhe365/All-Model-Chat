
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, StopCircle, Check, X, Trash2, Loader2 } from 'lucide-react';
import { useWindowContext } from '../../contexts/WindowContext';
import { Modal } from '../shared/Modal';

interface AudioRecorderProps {
  onRecord: (file: File) => Promise<void>;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecord, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [volume, setVolume] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const audioUrlRef = useRef<string | null>(null);
    const recordingCancelledRef = useRef(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    
    const { window: targetWindow } = useWindowContext();

    const stopAudioAnalysis = useCallback(() => {
        if (animationFrameIdRef.current) {
            targetWindow.cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
        }
        sourceRef.current?.disconnect();
        audioContextRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
        setVolume(0);
    }, [targetWindow]);

    const cleanupStream = useCallback((stream: MediaStream | null) => {
        stream?.getTracks().forEach(track => track.stop());
        stopAudioAnalysis();
    }, [stopAudioAnalysis]);

    const startRecording = useCallback(async () => {
        setAudioBlob(null);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
        recordingCancelledRef.current = false;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                cleanupStream(stream);
                if (recordingCancelledRef.current) return;
                
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (blob.size === 0) return;
                setAudioBlob(blob);
                audioUrlRef.current = URL.createObjectURL(blob);
            };
            
            audioChunksRef.current = [];
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerIntervalRef.current = targetWindow.setInterval(() => setRecordingTime(prev => prev + 1), 1000);

            const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextConstructor();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            sourceRef.current = source;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const draw = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteTimeDomainData(dataArray);
                let sumSquares = 0.0;
                for (const amplitude of dataArray) {
                    const val = (amplitude / 128.0) - 1.0;
                    sumSquares += val * val;
                }
                const rms = Math.sqrt(sumSquares / dataArray.length);
                setVolume(rms * 150); // Scale RMS for better visualization
                animationFrameIdRef.current = targetWindow.requestAnimationFrame(draw);
            };
            draw();

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please check permissions.");
        }
    }, [cleanupStream, targetWindow]);

    useEffect(() => {
        setIsInitializing(true);
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                cleanupStream(stream); // release the mic immediately
                setIsInitializing(false);
            })
            .catch(err => {
                console.error("Pre-check mic error:", err);
                setError("Could not access microphone. Please check permissions.");
                setIsInitializing(false);
            });
            
        return () => {
            if (timerIntervalRef.current) targetWindow.clearInterval(timerIntervalRef.current);
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
            stopAudioAnalysis();
        };
    }, [cleanupStream, stopAudioAnalysis, targetWindow]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            recordingCancelledRef.current = false;
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) targetWindow.clearInterval(timerIntervalRef.current);
        }
    }, [isRecording, targetWindow]);

    const handleCancel = useCallback(() => {
        if (isRecording) {
            recordingCancelledRef.current = true;
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) targetWindow.clearInterval(timerIntervalRef.current);
        }
        onCancel();
    }, [isRecording, onCancel, targetWindow]);

    const handleSave = async () => {
        if (audioBlob && !isSaving) {
            setIsSaving(true);
            const fileName = `recording-${new Date().toISOString().slice(0, 19)}.webm`;
            const file = new File([audioBlob], fileName, { type: 'audio/webm' });
            await onRecord(file);
        }
    };
    
    const handleDiscard = () => {
        setAudioBlob(null);
        setRecordingTime(0);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = (time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const scale = 1 + Math.min(volume, 100) / 100 * 0.5;
    const opacity = 0.2 + Math.min(volume, 100) / 100 * 0.5;

    return (
        <Modal 
            isOpen={true} 
            onClose={handleCancel}
            backdropClassName="bg-black/80 backdrop-blur-sm"
            contentClassName="w-full max-w-sm bg-[var(--theme-bg-secondary)] rounded-2xl shadow-premium p-6 text-center text-[var(--theme-text-primary)] flex flex-col gap-6"
            noPadding
        >
            {isInitializing || error ? (
                <>
                    <h2 id="audio-recorder-title" className="text-xl font-semibold">Audio Recorder</h2>
                    <div className="flex items-center justify-center h-32">
                        {isInitializing ? (
                            <Loader2 size={40} className="animate-spin text-[var(--theme-text-link)]" />
                        ) : (
                            <p className="text-red-400 p-4 text-center">{error}</p>
                        )}
                    </div>
                    <button onClick={onCancel} className="mt-4 px-6 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-border-primary)] rounded-lg transition-colors w-full">Close</button>
                </>
            ) : audioBlob && audioUrlRef.current ? (
                <>
                    <h2 id="audio-recorder-title" className="text-xl font-semibold">Preview Recording</h2>
                    <div className="my-4">
                        <audio src={audioUrlRef.current} controls className="w-full" />
                    </div>
                    <div className="flex justify-center gap-4">
                        <button onClick={handleDiscard} disabled={isSaving} className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--theme-bg-tertiary)] rounded-lg hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Trash2 size={20} /> Discard</button>
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--theme-bg-accent)] rounded-lg hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} /> <span>Save</span></>}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <h2 id="audio-recorder-title" className="text-xl font-semibold">{isRecording ? "Recording..." : "Ready to Record"}</h2>
                    
                    <div className="relative w-40 h-40 bg-white dark:bg-[var(--theme-bg-primary)] rounded-full flex items-center justify-center mx-auto my-4 shadow-lg">
                        {isRecording && (
                            <div
                                className="absolute inset-0 bg-blue-500 rounded-full transition-all duration-150 ease-out pointer-events-none"
                                style={{ transform: `scale(${scale})`, opacity: opacity, filter: 'blur(10px)' }}
                            ></div>
                        )}
                        <span className="text-5xl font-mono text-black dark:text-[var(--theme-text-primary)] tabular-nums z-10">{formatTime(recordingTime)}</span>
                    </div>

                    <div className="flex justify-around items-center w-full">
                        <button onClick={handleCancel} className="w-14 h-14 flex items-center justify-center bg-gray-200 dark:bg-[var(--theme-bg-tertiary)] hover:bg-gray-300 dark:hover:bg-[var(--theme-border-primary)] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white rounded-full transition-colors" aria-label="Cancel recording">
                            <X size={28} />
                        </button>
                        
                        {isRecording ? (
                            <button onClick={stopRecording} className="w-20 h-20 bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-white rounded-full flex items-center justify-center shadow-lg mic-recording-animate" aria-label="Stop recording">
                                <StopCircle size={36} />
                            </button>
                        ) : (
                            <button onClick={startRecording} className="w-20 h-20 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-100" aria-label="Start recording">
                                <Mic size={36} />
                            </button>
                        )}
                        
                        <div className="w-14 h-14" />
                    </div>
                </>
            )}
        </Modal>
    );
};