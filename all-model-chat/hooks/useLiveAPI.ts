
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { LiveServerMessage, Modality, Tool } from '@google/genai';
import { getConfiguredApiClient } from '../services/api/baseApi';
import { logService } from '../utils/appUtils';
import { AppSettings, ChatSettings } from '../types';
import { getKeyForRequest } from '../utils/apiUtils';
import { float32ToPCM16Base64 } from '../utils/audio/audioProcessing';
import { useLiveAudio } from './live-api/useLiveAudio';
import { useLiveVideo } from './live-api/useLiveVideo';

interface UseLiveAPIProps {
    appSettings: AppSettings;
    chatSettings: ChatSettings;
    modelId: string;
    onClose?: () => void;
    onTranscript?: (text: string, role: 'user' | 'model', isFinal: boolean) => void;
}

export const useLiveAPI = ({ appSettings, chatSettings, modelId, onClose, onTranscript }: UseLiveAPIProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sessionRef = useRef<Promise<any> | null>(null);
    
    // Video Interval Ref to manage the capture loop
    const frameIntervalRef = useRef<number | null>(null);

    // 1. Audio Management Hook
    const { 
        volume, 
        isSpeaking, 
        initializeAudio, 
        playAudioChunk, 
        stopAudioPlayback, 
        cleanupAudio 
    } = useLiveAudio();

    // 2. Video Management Hook
    const { 
        videoStream, 
        videoRef, 
        startVideo, 
        stopVideo, 
        captureFrame 
    } = useLiveVideo();

    const connect = useCallback(async () => {
        setError(null);
        try {
            // Get API Key using the current chat settings to respect locked keys or rotation
            const keyResult = getKeyForRequest(appSettings, chatSettings, { skipIncrement: true });
            if ('error' in keyResult) {
                throw new Error(keyResult.error);
            }

            const ai = await getConfiguredApiClient(keyResult.key);
            
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

            // Construct Tools Configuration
            const tools: Tool[] = [];
            if (chatSettings.isGoogleSearchEnabled || chatSettings.isDeepSearchEnabled) {
                tools.push({ googleSearch: {} });
            }
            if (chatSettings.isCodeExecutionEnabled) {
                tools.push({ codeExecution: {} });
            }

            // Connect Session
            const sessionPromise = ai.live.connect({
                model: modelId,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: chatSettings.ttsVoice || 'Zephyr' } },
                    },
                    systemInstruction: chatSettings.systemInstruction,
                    tools: tools.length > 0 ? tools : undefined,
                    // Enable transcription for both input and output
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        logService.info("Live API Connected", { tools: tools.length > 0 });
                        setIsConnected(true);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        // Handle Audio Output
                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData) {
                            await playAudioChunk(audioData);
                        }

                        // Handle Interruption
                        if (msg.serverContent?.interrupted) {
                            stopAudioPlayback();
                        }

                        // Handle Transcriptions
                        if (msg.serverContent?.inputTranscription && onTranscript) {
                            onTranscript(msg.serverContent.inputTranscription.text, 'user', false);
                        }
                        if (msg.serverContent?.outputTranscription && onTranscript) {
                            onTranscript(msg.serverContent.outputTranscription.text, 'model', false);
                        }

                        // Handle Turn Complete (Using generic role 'model' or 'user' logic upstream handles finalization if needed)
                        // Typically turnComplete signifies end of model turn, but we rely on stream updates.
                        // We can use it to signal "final" if necessary, but for now continous stream is fine.
                    },
                    onclose: () => {
                        logService.info("Live API Closed");
                        setIsConnected(false);
                        if (onClose) onClose();
                    },
                    onerror: (err) => {
                        logService.error("Live API Error", err);
                        setError(err.message || "Connection error");
                        setIsConnected(false);
                    }
                }
            });

            sessionRef.current = sessionPromise;

        } catch (err: any) {
            logService.error("Failed to connect to Live API", err);
            setError(err.message || "Failed to start session");
            setIsConnected(false);
            cleanupAudio(); // Ensure cleanup on init failure
        }
    }, [appSettings, chatSettings, modelId, onClose, initializeAudio, playAudioChunk, stopAudioPlayback, cleanupAudio, onTranscript]);

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
        if (sessionRef.current) {
            sessionRef.current.then((session: any) => session.close());
        }
        
        cleanupAudio();
        stopVideo(); // Stop video stream if active

        setIsConnected(false);
        
        if (onClose) onClose();
    }, [onClose, cleanupAudio, stopVideo]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isConnected) {
                disconnect();
            }
        };
    }, [disconnect, isConnected]);

    return useMemo(() => ({ 
        isConnected, 
        isSpeaking, 
        error, 
        volume, 
        connect, 
        disconnect, 
        sendText,
        videoStream,
        startVideo, 
        stopVideo,
        videoRef
    }), [isConnected, isSpeaking, error, volume, connect, disconnect, sendText, videoStream, startVideo, stopVideo, videoRef]);
};
