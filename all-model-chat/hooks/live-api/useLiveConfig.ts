
import { useMemo } from 'react';
import { AppSettings, ChatSettings } from '../../types';
import { Tool } from '@google/genai';
import { MediaResolution } from '../../types/settings';

interface UseLiveConfigProps {
    appSettings: AppSettings;
    chatSettings: ChatSettings;
    sessionHandle: string | null;
    clientFunctions?: Record<string, any>;
}

export const useLiveConfig = ({ chatSettings, sessionHandle, clientFunctions }: UseLiveConfigProps) => {
    return useMemo(() => {
        // Construct Tools Configuration
        const tools: Tool[] = [];
        
        // Server-side tools
        if (chatSettings.isGoogleSearchEnabled || chatSettings.isDeepSearchEnabled) {
            tools.push({ googleSearch: {} });
        }
        
        // Code execution is not supported by Native Audio models (Live API)
        
        // Client-side tools (Function Declarations could be processed here if provided in a specific format)
        // For now, we assume clientFunctions logic is handled in the message processor, 
        // but if we needed to send declarations, we would add them here.
        // if (clientFunctions) { ... }

        // Build Config
        const liveConfig: any = {
            // Use string literal 'AUDIO' for better compatibility in Live API JSON serialization
            responseModalities: ['AUDIO'], 
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: chatSettings.ttsVoice || 'Zephyr' } },
            },
            // Fix: systemInstruction must be a Content object { parts: [{ text: ... }] } for Live API
            systemInstruction: chatSettings.systemInstruction 
                ? { parts: [{ text: chatSettings.systemInstruction }] } 
                : undefined,
            tools: tools.length > 0 ? tools : undefined,
            // Enable transcription for both input and output
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            // Enable Context Compression for long conversations
            contextWindowCompression: {
                slidingWindow: {}
            },
            // Use configured media resolution
            mediaResolution: chatSettings.mediaResolution
        };

        // Configure Thinking for Native Audio models if enabled in settings
        // 0 means disabled. -1 means auto. >0 means manual budget.
        if (chatSettings.thinkingBudget !== 0) {
             const thinkingConfig: any = {
                includeThoughts: true 
             };
             if (chatSettings.thinkingBudget > 0) {
                 thinkingConfig.thinkingBudget = chatSettings.thinkingBudget;
             }
             liveConfig.thinkingConfig = thinkingConfig;
        }

        // Enable Session Resumption if we have a handle
        if (sessionHandle) {
            liveConfig.sessionResumption = { handle: sessionHandle };
        }

        return { liveConfig, tools };
    }, [chatSettings, sessionHandle, clientFunctions]);
};
