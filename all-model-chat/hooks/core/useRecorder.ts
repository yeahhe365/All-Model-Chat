
import { useState, useRef, useCallback, useEffect } from 'react';
import { getMixedAudioStream } from '../../utils/audio/audioProcessing';

export type RecorderStatus = 'idle' | 'recording' | 'paused';

interface UseRecorderOptions {
    onStop?: (blob: Blob) => void;
    onError?: (error: string) => void;
}

interface AudioDevice {
    deviceId: string;
    label: string;
}

export const useRecorder = (options: UseRecorderOptions = {}) => {
    const { onStop, onError } = options;
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [isInitializing, setIsInitializing] = useState(false);
    const [duration, setDuration] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Device Management
    const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const originalMicStreamRef = useRef<MediaStream | null>(null); // Track original mic stream separately
    const mixedStreamCleanupRef = useRef<(() => void) | null>(null);

    // Fetch devices on mount
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                // Request permission first to get labels
                await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
                
                const devices = await navigator.mediaDevices.enumerateDevices();
                const inputs = devices
                    .filter(d => d.kind === 'audioinput')
                    .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}...` }));
                setAudioDevices(inputs);
            } catch (e) {
                console.warn("Could not enumerate devices:", e);
            }
        };
        fetchDevices();
        
        navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    }, []);

    // Sync stream state to ref for cleanup access
    useEffect(() => {
        streamRef.current = stream;
    }, [stream]);

    const cleanup = useCallback(() => {
        // Stop the active stream (final mixed stream or mic stream)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            setStream(null);
            streamRef.current = null;
        }

        // Explicitly stop original mic stream if it exists
        // This handles cases where streamRef was pointing to a mixed WebAudio destination stream
        if (originalMicStreamRef.current) {
            originalMicStreamRef.current.getTracks().forEach(t => t.stop());
            originalMicStreamRef.current = null;
        }
        
        if (mixedStreamCleanupRef.current) {
            mixedStreamCleanupRef.current();
            mixedStreamCleanupRef.current = null;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        mediaRecorderRef.current = null;
    }, []);

    // Ensure cleanup on unmount only
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    const startRecording = useCallback(async (includeSystemAudio: boolean = false) => {
        setError(null);
        setIsInitializing(true);
        try {
            // 1. Get Microphone Stream with RAW constraints
            // We disable processing to ensure physical isolation from system output and higher quality for AI
            const constraints: MediaTrackConstraints = {
                deviceId: selectedDeviceId && selectedDeviceId !== 'default' ? { exact: selectedDeviceId } : undefined,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 1
            };

            const micStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
            originalMicStreamRef.current = micStream; // Store ref
            
            // 2. Mix with System Audio if requested
            const { stream: finalStream, cleanup: streamCleanup } = await getMixedAudioStream(micStream, includeSystemAudio);
            mixedStreamCleanupRef.current = streamCleanup;
            
            setStream(finalStream);
            // streamRef will be updated by effect
            
            const recorder = new MediaRecorder(finalStream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                // Only fire callback if we have data
                if (blob.size > 0 && onStop) {
                    onStop(blob);
                }
                cleanup();
            };

            recorder.start();
            setStatus('recording');
            setDuration(0);
            timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
        } catch (err) {
            console.error("Recorder error:", err);
            const msg = "Could not access microphone or system audio. Please check permissions.";
            setError(msg);
            if (onError) onError(msg);
            setStatus('idle');
            cleanup();
        } finally {
            setIsInitializing(false);
        }
    }, [onStop, onError, cleanup, selectedDeviceId]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setStatus('idle');
        }
    }, []);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            // Nullify handlers to prevent onStop callback from firing with data
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.onstop = null;
            
            if (mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        }
        setStatus('idle');
        setDuration(0);
        cleanup();
    }, [cleanup]);

    return {
        status,
        isInitializing,
        duration,
        error,
        stream,
        startRecording,
        stopRecording,
        cancelRecording,
        audioDevices,
        selectedDeviceId,
        setSelectedDeviceId
    };
};
