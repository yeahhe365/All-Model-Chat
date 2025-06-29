import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, StopCircle, Check, X, Trash2, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecord: (file: File) => Promise<void>;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecord, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volume, setVolume] = useState(0); // For visualization
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    sourceRef.current?.disconnect();
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    setVolume(0);
  }, []);

  const startRecording = useCallback(async () => {
    setAudioBlob(null);
    if(audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // --- Setup MediaRecorder for recording ---
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            audioUrlRef.current = URL.createObjectURL(blob);
            stream.getTracks().forEach(track => track.stop());
            stopAudioAnalysis(); // Stop analysis when recording stops
        };

        audioChunksRef.current = [];
        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        timerIntervalRef.current = window.setInterval(() => {
            setRecordingTime(prevTime => prevTime + 1);
        }, 1000);

        // --- Setup Web Audio API for visualization ---
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
            setVolume(average);
            animationFrameIdRef.current = requestAnimationFrame(draw);
        };
        draw();

    } catch (err) {
        console.error("Error accessing microphone:", err);
        setError("Could not access microphone. Please check permissions.");
    }
  }, [stopAudioAnalysis]);

  useEffect(() => {
    setIsInitializing(true);
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            stream.getTracks().forEach(track => track.stop()); // release the mic immediately
            setIsInitializing(false);
        })
        .catch(err => {
            console.error("Pre-check mic error:", err);
            setError("Could not access microphone. Please check permissions.");
            setIsInitializing(false);
        });
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
      stopAudioAnalysis();
    };
  }, [stopAudioAnalysis]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      // stopAudioAnalysis is called in onstop handler of MediaRecorder
    }
  }, [isRecording]);

  const handleSave = async () => {
    if (audioBlob && !isSaving) {
      setIsSaving(true);
      const fileName = `recording-${new Date().toISOString().slice(0,19)}.webm`;
      const file = new File([audioBlob], fileName, { type: 'audio/webm' });
      await onRecord(file);
    }
  };
  
  const handleDiscard = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    if(audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const renderContent = () => {
    if (isInitializing || error) {
        return (
            <div className="w-full max-w-sm bg-[var(--theme-bg-secondary)] rounded-lg p-6 text-white text-center">
                <h2 className="text-xl font-semibold text-[var(--theme-text-primary)] mb-4">Audio Recorder</h2>
                <div className="flex items-center justify-center h-24">
                {isInitializing ? (
                    <Loader2 size={32} className="animate-spin text-[var(--theme-text-link)]" />
                ) : (
                    <p className="text-red-400 p-4 text-center">{error}</p>
                )}
                </div>
                <button onClick={onCancel} className="mt-4 px-6 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-border-primary)] rounded-lg transition-colors">Close</button>
            </div>
        );
    }
    if (audioBlob && audioUrlRef.current) {
        return (
            <div className="w-full max-w-sm bg-[var(--theme-bg-secondary)] rounded-lg p-6 text-white text-center">
                <h3 className="text-lg mb-4 text-[var(--theme-text-primary)]">Preview Recording</h3>
                <audio src={audioUrlRef.current} controls className="w-full mb-6" />
                <div className="flex justify-center gap-4">
                    <button onClick={handleDiscard} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg-tertiary)] rounded-lg hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={20} /> Discard</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--theme-bg-accent)] rounded-lg hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] disabled:opacity-50 disabled:cursor-not-allowed w-32">
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} /> <span>Save</span></>}
                    </button>
                </div>
            </div>
        );
    }
    
    // Map volume (0-255) to a scale factor (e.g., 1 to 1.5) and opacity (e.g., 0.2 to 0.7)
    const scale = 1 + (volume / 255) * 0.5;
    const opacity = 0.2 + (volume / 255) * 0.5;

    return (
        <div className="w-full max-w-sm bg-[var(--theme-bg-secondary)] rounded-lg p-6 text-white text-center">
            <h3 className="text-xl font-semibold mb-2 text-[var(--theme-text-primary)]">{isRecording ? "Recording..." : "Ready to Record"}</h3>
            <div className="relative mb-6 h-24 flex items-center justify-center">
                {isRecording && (
                    <div
                        className="absolute w-24 h-24 bg-red-500 rounded-full transition-transform duration-100 ease-out"
                        style={{ transform: `scale(${scale})`, opacity: opacity }}
                    ></div>
                )}
                <div className="relative w-24 h-24 bg-[var(--theme-bg-tertiary)] rounded-full flex items-center justify-center">
                    <p className="text-3xl font-mono text-[var(--theme-text-primary)]">{formatTime(recordingTime)}</p>
                </div>
            </div>
            <div className="flex justify-center items-center gap-6">
                <button onClick={onCancel} className="p-3 bg-transparent text-gray-400 hover:text-white rounded-full transition-colors" aria-label="Cancel recording"><X size={24} /></button>
                {isRecording ? (
                    <button onClick={stopRecording} className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg" aria-label="Stop recording"><StopCircle size={32} /></button>
                ) : (
                    <button onClick={startRecording} className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg" aria-label="Start recording"><Mic size={32} /></button>
                )}
                <div style={{width: '60px'}}></div> {/* Spacer */}
            </div>
        </div>
    );
  };
  
  return (
    <div 
        className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
        role="dialog" aria-modal="true" aria-labelledby="audio-recorder-title"
    >
        {renderContent()}
    </div>
  );
};