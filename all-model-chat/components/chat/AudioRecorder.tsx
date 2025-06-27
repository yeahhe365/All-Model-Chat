import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, StopCircle, Check, X, Trash2, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecord: (file: File) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecord, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    setAudioBlob(null);
    if(audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            audioUrlRef.current = URL.createObjectURL(blob);
            stream.getTracks().forEach(track => track.stop());
        };

        audioChunksRef.current = [];
        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        timerIntervalRef.current = window.setInterval(() => {
            setRecordingTime(prevTime => prevTime + 1);
        }, 1000);
    } catch (err) {
        console.error("Error accessing microphone:", err);
        setError("Could not access microphone. Please check permissions.");
    }
  }, []);

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
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [isRecording]);

  const handleSave = () => {
    if (audioBlob) {
      const fileName = `recording-${new Date().toISOString().slice(0,19)}.webm`;
      const file = new File([audioBlob], fileName, { type: 'audio/webm' });
      onRecord(file);
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
                    <button onClick={handleDiscard} className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg-tertiary)] rounded-lg hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-primary)]"><Trash2 size={20} /> Discard</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg-accent)] rounded-lg hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)]"><Check size={20} /> Save</button>
                </div>
            </div>
        );
    }
    return (
        <div className="w-full max-w-sm bg-[var(--theme-bg-secondary)] rounded-lg p-6 text-white text-center">
            <h3 className="text-xl font-semibold mb-2 text-[var(--theme-text-primary)]">{isRecording ? "Recording..." : "Ready to Record"}</h3>
            <div className="relative mb-6 h-24 flex items-center justify-center">
                {isRecording && <div className="absolute w-24 h-24 bg-red-500/30 rounded-full animate-ping"></div>}
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
