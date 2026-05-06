import { useState, useRef, useCallback, useEffect } from 'react';
import { getMixedAudioStream } from '@/features/audio/audioProcessing';

type RecorderStatus = 'idle' | 'recording' | 'paused';

interface UseRecorderOptions {
  onStop?: (blob: Blob) => void;
  onError?: (error: string) => void;
  onSystemAudioWarning?: (warning: string | null) => void;
}

const RECORDING_MIME_TYPE_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

const getSupportedRecordingMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }

  return RECORDING_MIME_TYPE_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
};

const stopStreamTracks = (targetStream: MediaStream | null) => {
  targetStream?.getTracks().forEach((track) => track.stop());
};

export const useRecorder = (options: UseRecorderOptions = {}) => {
  const { onStop, onError, onSystemAudioWarning } = options;
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [isInitializing, setIsInitializing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Track resources for cleanup
  const micStreamRef = useRef<MediaStream | null>(null);
  const mixedStreamCleanupRef = useRef<(() => void) | null>(null);
  const startRequestIdRef = useRef(0);

  // Sync stream state to ref for cleanup access
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  const cleanup = useCallback(() => {
    // Stop main recorder stream (could be mixed or raw mic)
    if (streamRef.current) {
      stopStreamTracks(streamRef.current);
      setStream(null);
      streamRef.current = null;
    }

    // Run mixed stream specific cleanup (closes AudioContext, stops display stream)
    if (mixedStreamCleanupRef.current) {
      mixedStreamCleanupRef.current();
      mixedStreamCleanupRef.current = null;
    }

    // Stop raw mic stream
    if (micStreamRef.current) {
      stopStreamTracks(micStreamRef.current);
      micStreamRef.current = null;
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

  const startRecording = useCallback(
    async (opts?: { captureSystemAudio?: boolean }) => {
      const requestId = startRequestIdRef.current + 1;
      startRequestIdRef.current = requestId;
      setError(null);
      setIsInitializing(true);
      onSystemAudioWarning?.(null);
      cleanup(); // Ensure fresh start

      try {
        // 1. Get Microphone Stream
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        if (startRequestIdRef.current !== requestId) {
          stopStreamTracks(micStream);
          return;
        }

        // Store mic stream to stop it later
        micStreamRef.current = micStream;

        // 2. Mix with System Audio if requested
        const {
          stream: finalStream,
          cleanup: streamCleanup,
          warning: systemAudioWarning,
        } = await getMixedAudioStream(micStream, opts?.captureSystemAudio);

        if (startRequestIdRef.current !== requestId) {
          streamCleanup();
          stopStreamTracks(finalStream);
          stopStreamTracks(micStream);
          return;
        }

        onSystemAudioWarning?.(systemAudioWarning ?? null);

        // Store cleanup for mixed stream resources
        mixedStreamCleanupRef.current = streamCleanup;

        setStream(finalStream);

        const supportedMimeType = getSupportedRecordingMimeType();
        const recorder = supportedMimeType
          ? new MediaRecorder(finalStream, { mimeType: supportedMimeType })
          : new MediaRecorder(finalStream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || supportedMimeType || 'audio/webm' });
          // Only fire callback if we have data
          if (blob.size > 0 && onStop) {
            onStop(blob);
          }
          cleanup();
        };

        recorder.start();
        setStatus('recording');
        setDuration(0);
        timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
      } catch (err) {
        console.error('Recorder error:', err);
        const msg = 'Could not start recording. Please check permissions.';
        setError(msg);
        if (onError) onError(msg);
        setStatus('idle');
        cleanup();
      } finally {
        if (startRequestIdRef.current === requestId) {
          setIsInitializing(false);
        }
      }
    },
    [onStop, onError, onSystemAudioWarning, cleanup],
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setStatus('idle');
    }
  }, []);

  const cancelRecording = useCallback(() => {
    startRequestIdRef.current += 1;
    if (mediaRecorderRef.current) {
      // Nullify handlers to prevent onStop callback from firing with data
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;

      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
    setStatus('idle');
    setIsInitializing(false);
    setDuration(0);
    onSystemAudioWarning?.(null);
    cleanup();
  }, [cleanup, onSystemAudioWarning]);

  return {
    status,
    isInitializing,
    duration,
    error,
    stream,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
