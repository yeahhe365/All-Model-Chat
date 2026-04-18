
import { useState, useCallback, useEffect } from 'react';
import { useRecorder } from './core/useRecorder';

export type RecorderState = 'idle' | 'recording' | 'review';

export const useAudioRecorder = () => {
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // Cleanup previous URL when component unmounts or url changes
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const resetPreview = useCallback(() => {
        setAudioBlob(null);
        setAudioUrl((currentUrl) => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
            return null;
        });
    }, []);

    const handleRecordingComplete = useCallback((blob: Blob) => {
        const nextAudioUrl = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl((currentUrl) => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
            return nextAudioUrl;
        });
    }, []);

    const { 
        status, 
        isInitializing, 
        duration, 
        error, 
        stream, 
        startRecording: startCore, 
        stopRecording, 
        cancelRecording: cancelCore 
    } = useRecorder({
        onStop: handleRecordingComplete,
        onError: resetPreview,
    });

    const startRecording = useCallback((opts?: { captureSystemAudio?: boolean }) => {
        startCore(opts);
    }, [startCore]);

    const discardRecording = useCallback(() => {
        resetPreview();
        cancelCore(); // Ensures stream is closed if in weird state
    }, [cancelCore, resetPreview]);

    const viewState: RecorderState =
        audioBlob ? 'review' : status === 'recording' ? 'recording' : 'idle';

    return {
        viewState,
        isInitializing,
        recordingTime: duration,
        audioBlob,
        audioUrl,
        error,
        stream,
        status,
        startRecording,
        stopRecording,
        discardRecording
    };
};
