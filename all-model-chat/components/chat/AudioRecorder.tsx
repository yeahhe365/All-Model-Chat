
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useWindowContext } from '../../contexts/WindowContext';
import { Modal } from '../shared/Modal';
import { AudioPlayer } from '../shared/AudioPlayer';

interface AudioRecorderProps {
  onRecord: (file: File) => Promise<void>;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecord, onCancel }) => {
    // States
    const [viewState, setViewState] = useState<'idle' | 'recording' | 'review'>('idle');
    const [isInitializing, setIsInitializing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    const { window: targetWindow } = useWindowContext();

    // Cleanup resources
    const cleanupAudioGraph = useCallback(() => {
        if (animationFrameIdRef.current) {
            targetWindow.cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
    }, [targetWindow]);

    const cleanupStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        cleanupAudioGraph();
    }, [cleanupAudioGraph]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) targetWindow.clearInterval(timerIntervalRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            cleanupStream();
        };
    }, [cleanupStream, targetWindow, audioUrl]);

    // Visualizer Drawing Function
    const drawVisualizer = useCallback(() => {
        if (!analyserRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            if (!analyserRef.current) return;
            
            animationFrameIdRef.current = targetWindow.requestAnimationFrame(draw);
            analyserRef.current.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Style
            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            // Get color from CSS variable or fallback
            const style = getComputedStyle(document.body);
            const accentColor = style.getPropertyValue('--theme-bg-accent').trim() || '#3b82f6';
            ctx.fillStyle = accentColor;

            // Draw frequency bars
            // We only draw the lower half of the frequency spectrum as it contains most human voice energy
            const effectiveSlice = Math.floor(bufferLength * 0.7); 
            
            // Center the visualization
            const barCount = effectiveSlice;
            const totalBarWidth = barCount * (barWidth + 1);
            x = (width - totalBarWidth) / 2;

            for(let i = 0; i < effectiveSlice; i++) {
                // Scale height
                barHeight = (dataArray[i] / 255) * height * 0.9;
                
                // Rounded bar caps
                if (barHeight > 2) {
                    ctx.beginPath();
                    ctx.roundRect(x, (height - barHeight) / 2, barWidth, barHeight, 2);
                    ctx.fill();
                }

                x += barWidth + 1;
            }
        };

        draw();
    }, [targetWindow]);

    const startRecording = async () => {
        setError(null);
        setIsInitializing(true);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Setup MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (blob.size > 0) {
                    setAudioBlob(blob);
                    setAudioUrl(URL.createObjectURL(blob));
                    setViewState('review');
                }
                cleanupStream();
            };

            mediaRecorder.start();
            setViewState('recording');
            setRecordingTime(0);
            timerIntervalRef.current = targetWindow.setInterval(() => setRecordingTime(prev => prev + 1), 1000);

            // Setup Audio Context for Visualizer
            const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextConstructor();
            audioContextRef.current = audioContext;
            
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 64; // Low FFT size for fewer, wider bars (better aesthetics for voice)
            analyser.smoothingTimeConstant = 0.6; // Smooth transitions
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            source.connect(analyser);

            // Start visualizer
            // Slight delay to allow DOM to update if canvas was hidden
            setTimeout(drawVisualizer, 100);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please check permissions.");
            setViewState('idle');
        } finally {
            setIsInitializing(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            if (timerIntervalRef.current) {
                targetWindow.clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }
    };

    const handleDiscard = () => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setRecordingTime(0);
        setViewState('idle');
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
            setError("Failed to save recording.");
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
                    </div>
                )}

                {/* State: Recording */}
                {viewState === 'recording' && (
                    <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Timer */}
                        <div className="font-mono text-5xl font-light text-[var(--theme-text-primary)] tabular-nums tracking-wider">
                            {formatTime(recordingTime)}
                        </div>

                        {/* Visualizer Canvas */}
                        <div className="w-full h-16 flex items-center justify-center bg-[var(--theme-bg-tertiary)]/20 rounded-xl overflow-hidden">
                            <canvas 
                                ref={canvasRef} 
                                width={300} 
                                height={64} 
                                className="w-full h-full object-contain"
                            />
                        </div>

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

            {/* Footer Controls */}
            <div className="px-6 py-5 bg-[var(--theme-bg-tertiary)]/30 border-t border-[var(--theme-border-secondary)] flex justify-center gap-6">
                
                {/* Idle Controls */}
                {viewState === 'idle' && (
                    <button 
                        onClick={startRecording} 
                        disabled={isInitializing}
                        className="flex items-center gap-2 px-8 py-3 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-full font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Mic size={20} />
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
                            onClick={stopRecording} 
                            className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/30 transition-all hover:scale-105 active:scale-95 animate-pulse"
                            title="Stop Recording"
                        >
                            <Square size={24} fill="currentColor" />
                        </button>
                        {/* Placeholder for symmetry */}
                        <div className="w-12 h-12"></div> 
                    </>
                )}

                {/* Review Controls */}
                {viewState === 'review' && (
                    <>
                        <button 
                            onClick={handleDiscard}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--theme-bg-input)] text-[var(--theme-text-danger)] border border-[var(--theme-border-secondary)] hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-900/30 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={18} />
                            Discard
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] font-medium shadow-md transition-all hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            {isSaving ? 'Saving...' : 'Save Recording'}
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
};
