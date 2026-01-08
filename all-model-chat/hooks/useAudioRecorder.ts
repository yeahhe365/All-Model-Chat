
import { useState, useCallback, useEffect } from 'react';
import { useRecorder } from './core/useRecorder';

export type RecorderState = 'idle' | 'recording' | 'review';

export const useAudioRecorder = () => {
    const [viewState, setViewState] = useState<RecorderState>('idle');
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // Cleanup previous URL when component unmounts or url changes
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const handleRecordingComplete = useCallback((blob: Blob) => {
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setViewState('review');
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
        onError: () => setViewState('idle')
    });

    const startRecording = useCallback((opts?: { captureSystemAudio?: boolean }) => {
        startCore(opts);
    }, [startCore]);

    const discardRecording = useCallback(() => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setViewState('idle');
        cancelCore(); // Ensures stream is closed if in weird state
    }, [audioUrl, cancelCore]);

    // Sync viewState with recorder status for recording phase
    useEffect(() => {
        if (status === 'recording') {
            setViewState('recording');
        }
    }, [status]);

    return {
        viewState,
        isInitializing,
        recordingTime: duration,
        audioBlob,
        audioUrl,
        error,
        stream,
        startRecording,
        stopRecording,
        discardRecording
    };
};