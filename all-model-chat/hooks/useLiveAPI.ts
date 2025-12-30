
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { LiveSession } from '@google/genai';
import { getConfiguredApiClient } from '../services/api/baseApi';
import { logService } from '../utils/appUtils';
import { AppSettings, ChatSettings } from '../types';
import { getKeyForRequest } from '../utils/apiUtils';
import { float32ToPCM16Base64 } from '../utils/audio/audioProcessing';
import { useLiveAudio } from './live-api/useLiveAudio';
import { useLiveVideo } from './live-api/useLiveVideo';
import { useLiveConfig } from './live-api/useLiveConfig';
import { useLiveMessageProcessing } from './live-api/useLiveMessageProcessing';

interface UseLiveAPIProps {
    appSettings: AppSettings;
    chatSettings: ChatSettings;
    modelId: string;
    onClose?: () => void;
    onTranscript?: (text: string, role: 'user' | 'model', isFinal: boolean) => void;
    clientFunctions?: Record<string, (args: any) => Promise<any>>; // Registry for client-side tools
}

export const useLiveAPI = ({ appSettings, chatSettings, modelId, onClose, onTranscript, clientFunctions }: UseLiveAPIProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sessionRef = useRef<Promise<LiveSession> | null>(null);
    
    // Session Resumption State
    const [sessionHandle, setSessionHandle] = useState<string | null>(null);
    const sessionHandleRef = useRef<string | null>(null);

    // Reconnection State & Refs
    const [isReconnecting, setIsReconnecting] = useState(false);
    const retryCountRef = useRef(0);
    const isUserDisconnectRef = useRef(false);
    const reconnectTimeoutRef = useRef<any>(null);
    const maxRetries = 5;
    const baseDelay = 1000;
    
    // Video Interval Ref to manage the capture loop
    const frameIntervalRef = useRef<number | null>(null);

    // Sync Ref with State for Session Handle
    useEffect(() => {
        sessionHandleRef.current = sessionHandle;
    }, [sessionHandle]);

    // 1. Audio Management Hook
    const { 
        volume, 
        isSpeaking, 
        isMuted,
        toggleMute,
        initializeAudio, 
        playAudioChunk, 
        stopAudioPlayback, 
        cleanupAudio 
    } = useLiveAudio();

    // 2. Video Management Hook
    const { 
        videoStream, 
        videoSource, 
        videoRef, 
        startCamera, 
        startScreenShare,
        stopVideo, 
        captureFrame 
    } = useLiveVideo();

    // 3. Configuration Hook
    const { liveConfig, tools } = useLiveConfig({ 
        appSettings, 
        chatSettings, 
        sessionHandle: sessionHandleRef.current,
        clientFunctions
    });

    // 4. Message Processing Hook
    const { handleMessage } = useLiveMessageProcessing({
        playAudioChunk,
        stopAudioPlayback,
        onTranscript,
        clientFunctions,
        sessionRef,
        setSessionHandle,
        sessionHandleRef
    });

    // Forward declaration ref to allow triggerReconnect to call the latest connect function
    const connectRef = useRef<() => Promise<void>>(async () => {});

    const triggerReconnect = useCallback(() => {
        if (retryCountRef.current >= maxRetries) {
            logService.error("Max reconnection attempts reached.");
            setError("Connection lost. Please try again.");
            setIsReconnecting(false);
            setIsConnected(false);
            cleanupAudio();
            stopVideo();
            return;
        }

        setIsReconnecting(true);
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s... cap at 30s
        const delay = Math.min(30000, baseDelay * Math.pow(2, retryCountRef.current));
        
        const attempt = retryCountRef.current + 1;
        logService.warn(`Live API disconnected. Reconnecting in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        setError(`Connection lost. Reconnecting... (${attempt}/${maxRetries})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            connectRef.current(); // Call the latest connect function
        }, delay);
    }, [cleanupAudio, stopVideo]);

    const connect = useCallback(async () => {
        // Clear any pending reconnection timeout if we are manually connecting
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setError(null);
        isUserDisconnectRef.current = false; // Reset user disconnect flag

        try {
            // Get API Key using the current chat settings to respect locked keys or rotation
            const keyResult = getKeyForRequest(appSettings, chatSettings, { skipIncrement: true });
            if ('error' in keyResult) {
                throw new Error(keyResult.error);
            }

            // Specify API version v1alpha for Live API support
            const ai = await getConfiguredApiClient(keyResult.key, { apiVersion: 'v1alpha' });
            
            // Initialize Audio (Mic & Worklet)
            // We pass a callback that sends the encoded audio to the session
            await initializeAudio((pcmData) => {
                const base64Data = float32ToPCM16Base64(pcmData);
                if (sessionRef.current) {
                    sessionRef.current.then(session => {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: 'audio/pcm;rate=16000',
                                data: base64Data
                            }
                        });
                    });
                }
            });

            // Connect Session
            const sessionPromise = ai.live.connect({
                model: modelId,
                config: liveConfig,
                callbacks: {
                    onopen: () => {
                        logService.info("Live API Connected", { tools: tools?.length ?? 0, resumed: !!sessionHandleRef.current });
                        setIsConnected(true);
                        setIsReconnecting(false);
                        setError(null);
                        retryCountRef.current = 0; // Reset retries on success
                    },
                    onmessage: handleMessage,
                    onclose: (e) => {
                        logService.info("Live API Closed", e);
                        setIsConnected(false);
                        
                        // Finalize any open transcripts
                        if (onTranscript) {
                            onTranscript("", 'user', true);
                            onTranscript("", 'model', true);
                        }

                        // Only trigger reconnect if NOT user initiated
                        if (!isUserDisconnectRef.current) {
                            triggerReconnect();
                        } else {
                            if (onClose) onClose();
                        }
                    },
                    onerror: (err) => {
                        logService.error("Live API Error", err);
                        setIsConnected(false);
                        
                        // Finalize any open transcripts
                        if (onTranscript) {
                            onTranscript("", 'user', true);
                            onTranscript("", 'model', true);
                        }
                        
                        // Only trigger reconnect if NOT user initiated
                        if (!isUserDisconnectRef.current) {
                            triggerReconnect();
                        } else {
                            setError(err.message || "Connection error");
                        }
                    }
                }
            });

            sessionRef.current = sessionPromise;

        } catch (err: any) {
            logService.error("Failed to connect to Live API", err);
            setIsConnected(false);
            if (!isUserDisconnectRef.current) {
                triggerReconnect();
            } else {
                setError(err.message || "Failed to start session");
                cleanupAudio();
            }
        }
    }, [appSettings, chatSettings, modelId, onClose, onTranscript, initializeAudio, cleanupAudio, triggerReconnect, liveConfig, tools, handleMessage]);

    // Update the ref whenever connect changes so triggerReconnect calls the latest version
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const sendText = useCallback(async (text: string) => {
        if (!sessionRef.current) return;
        try {
            const session = await sessionRef.current;
            await session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
            logService.info("Sent text to Live API", { textLength: text.length });
        } catch (e) {
            logService.error("Failed to send text to Live API", e);
        }
    }, []);

    // Frame Capture Loop
    useEffect(() => {
        if (!isConnected || !videoStream) {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }
            return;
        }

        const sendFrame = () => {
            const base64Data = captureFrame();
            if (base64Data && sessionRef.current) {
                sessionRef.current.then(session => {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }
                    });
                });
            }
        };

        // 5 FPS = 200ms interval
        frameIntervalRef.current = window.setInterval(sendFrame, 200);

        return () => {
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        };
    }, [isConnected, videoStream, captureFrame]);

    const disconnect = useCallback(() => {
        isUserDisconnectRef.current = true; // Mark as user initiated
        
        // Cancel pending reconnects
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (sessionRef.current) {
            sessionRef.current.then((session: any) => session.close());
        }
        
        cleanupAudio();
        stopVideo(); // Stop video stream if active

        setIsConnected(false);
        setIsReconnecting(false);
        setSessionHandle(null); // Clear session handle on manual disconnect to start fresh next time
        sessionHandleRef.current = null;
        
        if (onClose) onClose();
    }, [onClose, cleanupAudio, stopVideo]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isUserDisconnectRef.current = true;
            if (isConnected || isReconnecting) {
                disconnect();
            }
        };
    }, [disconnect, isConnected, isReconnecting]);

    return useMemo(() => ({ 
        isConnected, 
        isSpeaking, 
        isMuted,
        toggleMute,
        error, 
        volume, 
        connect, 
        disconnect, 
        sendText,
        videoStream,
        videoSource, 
        startCamera, 
        startScreenShare, 
        stopVideo,
        videoRef,
        isReconnecting
    }), [isConnected, isSpeaking, isMuted, toggleMute, error, volume, connect, disconnect, sendText, videoStream, videoSource, startCamera, startScreenShare, stopVideo, videoRef, isReconnecting]);
};
