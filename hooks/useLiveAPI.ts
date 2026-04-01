
import { useState, useRef, useEffect, useMemo } from 'react';
import { LiveSession } from '@google/genai';
import { AppSettings, ChatSettings } from '../types';
import { useLiveAudio } from './live-api/useLiveAudio';
import { useLiveVideo } from './live-api/useLiveVideo';
import { useLiveConfig } from './live-api/useLiveConfig';
import { useLiveMessageProcessing } from './live-api/useLiveMessageProcessing';
import { useLiveConnection } from './live-api/useLiveConnection';
import { useLiveFrameCapture } from './live-api/useLiveFrameCapture';
import { useBackgroundKeepAlive } from './core/useBackgroundKeepAlive';

interface UseLiveAPIProps {
    appSettings: AppSettings;
    chatSettings: ChatSettings;
    modelId: string;
    onClose?: () => void;
    onTranscript?: (text: string, role: 'user' | 'model', isFinal: boolean, type?: 'content' | 'thought', audioUrl?: string | null) => void;
    clientFunctions?: Record<string, (args: any) => Promise<any>>; // Registry for client-side tools
}

export const useLiveAPI = ({ appSettings, chatSettings, modelId, onClose, onTranscript, clientFunctions }: UseLiveAPIProps) => {
    const sessionRef = useRef<Promise<LiveSession> | null>(null);

    // Session Resumption State
    const [sessionHandle, setSessionHandle] = useState<string | null>(null);
    const sessionHandleRef = useRef<string | null>(null);

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

    // 5. Connection Management Hook
    const { 
        isConnected, 
        isReconnecting, 
        error, 
        connect, 
        disconnect, 
        sendText 
    } = useLiveConnection({
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
    });

    // 6. Frame Capture Hook
    useLiveFrameCapture({
        isConnected,
        videoStream,
        captureFrame,
        sessionRef
    });

    // Prevent background throttling when connected
    useBackgroundKeepAlive(isConnected);

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
