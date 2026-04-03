import { useState, useRef, useCallback, useEffect } from 'react';
import { LiveSession, Tool } from '@google/genai';
import { AppSettings, ChatSettings } from '../../types';
import { logService } from '../../utils/appUtils';
import { getKeyForRequest } from '../../utils/apiUtils';
import { getConfiguredApiClient } from '../../services/api/baseApi';
import { float32ToPCM16Base64 } from '../../utils/audio/audioProcessing';

interface UseLiveConnectionProps {
    appSettings: AppSettings;
    chatSettings: ChatSettings;
    modelId: string;
    liveConfig: any;
    tools: Tool[];
    initializeAudio: (onAudioData: (data: Float32Array) => void) => Promise<any>;
    cleanupAudio: () => void;
    stopVideo: () => void;
    handleMessage: (msg: any) => void;
    onClose?: () => void;
    onTranscript?: (text: string, role: 'user' | 'model', isFinal: boolean, type?: 'content' | 'thought', audioUrl?: string | null) => void;
    setSessionHandle: (handle: string | null) => void;
    sessionHandleRef: React.MutableRefObject<string | null>;
    sessionRef: React.MutableRefObject<Promise<LiveSession> | null>;
}

export const useLiveConnection = ({
    appSettings,
    chatSettings,
    modelId,
    liveConfig,
    tools,
    initializeAudio,
    cleanupAudio,
    stopVideo,
    handleMessage,
    onClose,
    onTranscript,
    setSessionHandle,
    sessionHandleRef,
    sessionRef
}: UseLiveConnectionProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Ref to track connection state synchronously for audio callbacks
    const isConnectedRef = useRef(false);

    // Sync Ref with State (Keep as a fallback for external state changes)
    useEffect(() => {
        isConnectedRef.current = isConnected;
    }, [isConnected]);

    // Reconnection Refs
    const retryCountRef = useRef(0);
    const isUserDisconnectRef = useRef(false);
    const reconnectTimeoutRef = useRef<any>(null);
    const connectRef = useRef<() => Promise<void>>(async () => {});
    
    const maxRetries = 5;
    const baseDelay = 1000;

    const triggerReconnect = useCallback(() => {
        if (retryCountRef.current >= maxRetries) {
            logService.error("Max reconnection attempts reached.");
            setError("Connection lost. Please try again.");
            setIsReconnecting(false);
            
            // 同步修改 Ref 以立即拦截发送
            isConnectedRef.current = false;
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
                // IMPORTANT: If connection is closed/closing, stop sending immediately to prevent WebSocket flood errors
                if (!isConnectedRef.current) return;

                const base64Data = float32ToPCM16Base64(pcmData);
                if (sessionRef.current) {
                    sessionRef.current.then(session => {
                        try {
                            session.sendRealtimeInput({
                                media: {
                                    mimeType: 'audio/pcm;rate=16000',
                                    data: base64Data
                                }
                            });
                        } catch (e) {
                            // Catch synchronous send errors (e.g. if socket closed between checks)
                            console.warn("Failed to send audio frame:", e);
                        }
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
                        
                        // 【核心修复】：在连接建立的瞬间，立即同步修改 Ref 为 true。
                        // 确保 initializeAudio 回调中的 `!isConnectedRef.current` 检查能立即通过，
                        // 从而防止首个音频缓冲帧因为 React 渲染周期延迟而被丢弃。
                        isConnectedRef.current = true;
                        
                        setIsConnected(true);
                        setIsReconnecting(false);
                        setError(null);
                        retryCountRef.current = 0; // Reset retries on success
                    },
                    onmessage: handleMessage,
                    onclose: (e) => {
                        logService.info("Live API Closed", e);
                        
                        // 同步修改 Ref 防止报错
                        isConnectedRef.current = false;
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
                        
                        // 同步修改 Ref
                        isConnectedRef.current = false;
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
            
            // 同步修改 Ref
            isConnectedRef.current = false;
            setIsConnected(false);
            
            if (!isUserDisconnectRef.current) {
                triggerReconnect();
            } else {
                setError(err.message || "Failed to start session");
                cleanupAudio();
            }
        }
    }, [appSettings, chatSettings, modelId, onClose, onTranscript, initializeAudio, cleanupAudio, triggerReconnect, liveConfig, tools, handleMessage, sessionRef, sessionHandleRef]);

    const sendText = useCallback(async (text: string) => {
        if (!sessionRef.current) return;
        try {
            const session = await sessionRef.current;
            await session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
            logService.info("Sent text to Live API", { textLength: text.length });
        } catch (e) {
            logService.error("Failed to send text to Live API", e);
        }
    }, [sessionRef]);

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

        // 同步修改 Ref
        isConnectedRef.current = false;
        setIsConnected(false);
        setIsReconnecting(false);
        setSessionHandle(null); // Clear session handle on manual disconnect to start fresh next time
        sessionHandleRef.current = null;
        
        if (onClose) onClose();
    }, [onClose, cleanupAudio, stopVideo, sessionRef, setSessionHandle, sessionHandleRef]);

    // Update the ref whenever connect changes so triggerReconnect calls the latest version
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isUserDisconnectRef.current = true;
            if (isConnected || isReconnecting) {
                disconnect();
            }
        };
    }, [disconnect, isConnected, isReconnecting]);

    return {
        isConnected,
        isReconnecting,
        error,
        connect,
        disconnect,
        sendText
    };
};
