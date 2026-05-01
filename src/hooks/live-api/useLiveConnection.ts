import { useState, useRef, useCallback, useEffect } from 'react';
import type { LiveServerMessage, Part, Session as LiveSession, Tool } from '@google/genai';
import { AppSettings } from '../../types';
import { logService } from '../../services/logService';
import { getLiveApiClient, LiveApiAuthConfigurationError } from '../../services/api/liveApiAuth';
import { float32ToPCM16Base64 } from '../../utils/audio/audioProcessing';
import type { LiveErrorState } from './liveErrorState';
import { useStateWithRef } from '../useStateWithRef';

interface UseLiveConnectionProps {
  appSettings: AppSettings;
  modelId: string;
  liveConfig: unknown;
  liveApiKeyForConnection?: string | null;
  tools: Tool[];
  initializeAudio: (
    onAudioData: (data: Float32Array) => void,
  ) => Promise<void | { audioCtx: AudioContext; inputCtx: AudioContext }>;
  cleanupAudio: () => void;
  clearBufferedAudio?: () => void;
  stopVideo: () => void;
  handleMessage: (msg: LiveServerMessage) => void;
  onClose?: () => void;
  onTranscript?: (
    text: string,
    role: 'user' | 'model',
    isFinal: boolean,
    type?: 'content' | 'thought',
    audioUrl?: string | null,
  ) => void;
  setSessionHandle: (handle: string | null) => void;
  sessionHandleRef: React.MutableRefObject<string | null>;
  sessionRef: React.MutableRefObject<Promise<LiveSession> | null>;
}

export const useLiveConnection = ({
  appSettings,
  modelId,
  liveConfig,
  liveApiKeyForConnection,
  tools,
  initializeAudio,
  cleanupAudio,
  clearBufferedAudio,
  stopVideo,
  handleMessage,
  onClose,
  onTranscript,
  setSessionHandle,
  sessionHandleRef,
  sessionRef,
}: UseLiveConnectionProps) => {
  const [isConnected, setIsConnected, isConnectedRef] = useStateWithRef(false);
  const [errorState, setErrorState] = useState<LiveErrorState | null>(null);
  const [isReconnecting, setIsReconnecting, isReconnectingRef] = useStateWithRef(false);

  const isProactiveReconnectRef = useRef(false);
  const disconnectRef = useRef<() => void>(() => {});
  const setupCompleteResolveRef = useRef<(() => void) | null>(null);
  const setupCompleteRejectRef = useRef<((error: Error) => void) | null>(null);

  // Reconnection Refs
  const retryCountRef = useRef(0);
  const isUserDisconnectRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => Promise<boolean>>(async () => false);

  const maxRetries = 5;
  const baseDelay = 1000;

  const resetAudioState = useCallback(() => {
    clearBufferedAudio?.();
    cleanupAudio();
  }, [clearBufferedAudio, cleanupAudio]);

  const clearSetupCompleteWaiters = useCallback(() => {
    setupCompleteResolveRef.current = null;
    setupCompleteRejectRef.current = null;
  }, []);

  const resolveSetupComplete = useCallback(() => {
    setupCompleteResolveRef.current?.();
    clearSetupCompleteWaiters();
  }, [clearSetupCompleteWaiters]);

  const rejectSetupComplete = useCallback(
    (error: Error) => {
      setupCompleteRejectRef.current?.(error);
      clearSetupCompleteWaiters();
    },
    [clearSetupCompleteWaiters],
  );

  const setTranslationError = useCallback(
    (key: string, fallback?: string, values?: Record<string, string | number>) => {
      setErrorState({ kind: 'translation', key, fallback, values });
    },
    [],
  );

  const setRawError = useCallback((message: string) => {
    setErrorState({ kind: 'raw', message });
  }, []);

  const triggerReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      return;
    }

    resetAudioState();

    if (retryCountRef.current >= maxRetries) {
      logService.error('Max reconnection attempts reached.');
      setTranslationError('liveStatus_connection_lost_retry_failed', 'Connection lost. Please try again.');
      setIsReconnecting(false);
      setIsConnected(false);

      stopVideo();
      return;
    }

    setIsReconnecting(true);
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s... cap at 30s
    const delay = Math.min(30000, baseDelay * Math.pow(2, retryCountRef.current));

    const attempt = retryCountRef.current + 1;
    logService.warn(`Live API disconnected. Reconnecting in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
    setTranslationError(
      'liveStatus_reconnecting_attempt',
      'Connection lost. Reconnecting... ({attempt}/{maxRetries})',
      {
        attempt,
        maxRetries,
      },
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      retryCountRef.current++;
      connectRef.current(); // Call the latest connect function
    }, delay);
  }, [resetAudioState, setIsConnected, setIsReconnecting, stopVideo, setTranslationError]);

  const handleGoAway = useCallback(
    (goAway?: { timeLeft?: string }) => {
      if (isUserDisconnectRef.current || isProactiveReconnectRef.current || !sessionHandleRef.current) {
        return;
      }

      logService.info('Live API GoAway received', goAway ?? {});
      isProactiveReconnectRef.current = true;
      setIsReconnecting(true);
      setTranslationError('liveStatus_refreshing', 'Refreshing live session...');

      sessionRef.current?.then((session) => session.close());
    },
    [sessionHandleRef, sessionRef, setIsReconnecting, setTranslationError],
  );

  const connect = useCallback(async (): Promise<boolean> => {
    // Clear any pending reconnection timeout if we are manually connecting
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setErrorState(null);
    isUserDisconnectRef.current = false; // Reset user disconnect flag

    isProactiveReconnectRef.current = false;

    try {
      // Specify API version v1alpha for Live API support
      const ai = await getLiveApiClient(appSettings, { apiVersion: 'v1alpha' }, liveApiKeyForConnection);
      const setupCompletePromise = new Promise<void>((resolve, reject) => {
        setupCompleteResolveRef.current = resolve;
        setupCompleteRejectRef.current = reject;
      });

      // Initialize Audio (Mic & Worklet)
      // We pass a callback that sends the encoded audio to the session
      await initializeAudio((pcmData) => {
        // IMPORTANT: If connection is closed/closing, stop sending immediately to prevent WebSocket flood errors
        if (!isConnectedRef.current) return;

        const base64Data = float32ToPCM16Base64(pcmData);
        if (sessionRef.current) {
          sessionRef.current.then((session) => {
            try {
              session.sendRealtimeInput({
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Data,
                },
              });
            } catch (e) {
              // Catch synchronous send errors (e.g. if socket closed between checks)
              console.warn('Failed to send audio frame:', e);
            }
          });
        }
      });

      // Connect Session
      const sessionPromise = ai.live.connect({
        model: modelId,
        config: liveConfig as Parameters<typeof ai.live.connect>[0]['config'],
        callbacks: {
          onopen: () => {
            logService.info('Live API Connected', { tools: tools?.length ?? 0, resumed: !!sessionHandleRef.current });
          },
          onmessage: (msg) => {
            if (msg.setupComplete) {
              setIsConnected(true);
              setIsReconnecting(false);
              setErrorState(null);
              retryCountRef.current = 0;
              resolveSetupComplete();
            }
            handleMessage(msg);
          },
          onclose: (e) => {
            logService.info('Live API Closed', e);
            sessionRef.current = null;
            rejectSetupComplete(new Error('Live API connection closed before setup completed.'));

            setIsConnected(false);

            // Finalize any open transcripts
            if (onTranscript) {
              onTranscript('', 'user', true);
              onTranscript('', 'model', true);
            }

            // Only trigger reconnect if NOT user initiated
            if (!isUserDisconnectRef.current) {
              if (isProactiveReconnectRef.current) {
                isProactiveReconnectRef.current = false;
                resetAudioState();
                void connectRef.current();
              } else {
                triggerReconnect();
              }
            } else {
              if (onClose) onClose();
            }
          },
          onerror: (err) => {
            logService.error('Live API Error', err);
            sessionRef.current = null;
            rejectSetupComplete(err instanceof Error ? err : new Error('Connection error'));

            setIsConnected(false);

            // Finalize any open transcripts
            if (onTranscript) {
              onTranscript('', 'user', true);
              onTranscript('', 'model', true);
            }

            // Only trigger reconnect if NOT user initiated
            if (!isUserDisconnectRef.current) {
              triggerReconnect();
            } else {
              if (err.message) {
                setRawError(err.message);
              } else {
                setTranslationError('liveStatus_connection_error', 'Connection error');
              }
            }
          },
        },
      });

      sessionRef.current = sessionPromise;
      await sessionPromise;
      await setupCompletePromise;
      return true;
    } catch (err) {
      logService.error('Failed to connect to Live API', err);
      clearSetupCompleteWaiters();

      setIsConnected(false);

      if (
        err instanceof LiveApiAuthConfigurationError ||
        (err instanceof Error && err.name === 'LiveApiAuthConfigurationError')
      ) {
        setIsReconnecting(false);
        const authError = err as LiveApiAuthConfigurationError & { code?: string };
        if (authError.code === 'MISSING_API_KEY') {
          setTranslationError('liveStatus_missing_api_key', 'Live API requires a browser API key.');
        } else if (err.message) {
          setRawError(err.message);
        } else {
          setTranslationError('liveStatus_failed_to_start', 'Failed to start session');
        }
        resetAudioState();
        stopVideo();
        return false;
      }

      if (!isUserDisconnectRef.current) {
        triggerReconnect();
      } else {
        if (err instanceof Error && err.message) {
          setRawError(err.message);
        } else {
          setTranslationError('liveStatus_failed_to_start', 'Failed to start session');
        }
        resetAudioState();
      }
      return false;
    }
  }, [
    appSettings,
    modelId,
    onClose,
    onTranscript,
    initializeAudio,
    resetAudioState,
    stopVideo,
    triggerReconnect,
    liveConfig,
    liveApiKeyForConnection,
    tools,
    handleMessage,
    sessionRef,
    sessionHandleRef,
    setIsConnected,
    setIsReconnecting,
    resolveSetupComplete,
    rejectSetupComplete,
    clearSetupCompleteWaiters,
    isConnectedRef,
    setRawError,
    setTranslationError,
  ]);

  const sendText = useCallback(
    async (text: string): Promise<boolean> => {
      if (!sessionRef.current || !isConnectedRef.current) return false;
      try {
        const session = await sessionRef.current;
        if (!isConnectedRef.current) return false;
        session.sendRealtimeInput({ text });
        logService.info('Sent text to Live API', { textLength: text.length });
        return true;
      } catch (e) {
        logService.error('Failed to send text to Live API', e);
        return false;
      }
    },
    [isConnectedRef, sessionRef],
  );

  const sendContent = useCallback(
    async (parts: Part[]): Promise<boolean> => {
      if (!sessionRef.current || !isConnectedRef.current || parts.length === 0) return false;
      try {
        const session = await sessionRef.current;
        if (!isConnectedRef.current) return false;
        session.sendClientContent({
          turns: {
            role: 'user',
            parts,
          },
          turnComplete: true,
        });
        logService.info('Sent client content to Live API', { partCount: parts.length });
        return true;
      } catch (e) {
        logService.error('Failed to send client content to Live API', e);
        return false;
      }
    },
    [isConnectedRef, sessionRef],
  );

  const disconnect = useCallback(() => {
    isUserDisconnectRef.current = true; // Mark as user initiated

    // Cancel pending reconnects
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    rejectSetupComplete(new Error('Live API connection closed before setup completed.'));

    if (sessionRef.current) {
      sessionRef.current.then((session) => session.close());
    }
    sessionRef.current = null;

    resetAudioState();
    stopVideo(); // Stop video stream if active

    setIsConnected(false);
    setIsReconnecting(false);
    setErrorState(null);
    setSessionHandle(null); // Clear session handle on manual disconnect to start fresh next time
    sessionHandleRef.current = null;

    if (onClose) onClose();
  }, [
    onClose,
    resetAudioState,
    stopVideo,
    sessionRef,
    setIsConnected,
    setIsReconnecting,
    setSessionHandle,
    sessionHandleRef,
    rejectSetupComplete,
  ]);

  // Update the ref whenever connect changes so triggerReconnect calls the latest version
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    const connectedRef = isConnectedRef;
    const reconnectingRef = isReconnectingRef;

    return () => {
      isUserDisconnectRef.current = true;
      if (connectedRef.current || reconnectingRef.current) {
        disconnectRef.current();
      }
    };
  }, [isConnectedRef, isReconnectingRef]);

  return {
    isConnected,
    isReconnecting,
    errorState,
    connect,
    handleGoAway,
    disconnect,
    sendText,
    sendContent,
  };
};
