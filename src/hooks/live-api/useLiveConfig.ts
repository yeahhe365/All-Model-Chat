
import { useMemo } from 'react';
import { AppSettings, ChatSettings } from '../../types';
import type { Tool } from '@google/genai';
import type { LiveClientFunctions } from '../../types';

interface UseLiveConfigProps {
    appSettings: AppSettings;
    chatSettings: ChatSettings;
    sessionHandle: string | null;
    clientFunctions?: LiveClientFunctions;
}

export const useLiveConfig = ({ chatSettings, sessionHandle, clientFunctions }: UseLiveConfigProps) => {
    return useMemo(() => {
        const modelId = chatSettings.modelId?.toLowerCase() ?? '';
        const isGemini31FlashLive = modelId.includes('gemini-3.1-flash-live');

        // Construct Tools Configuration
        const tools: Tool[] = [];
        
        // Server-side tools
        if (chatSettings.isGoogleSearchEnabled || chatSettings.isDeepSearchEnabled) {
            tools.push({ googleSearch: {} });
        }

        const functionDeclarations = Object.values(clientFunctions ?? {}).map(
            ({ declaration }) => declaration,
        );
        if (functionDeclarations.length > 0) {
            tools.push({ functionDeclarations });
        }

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
            // Enable session resumption from the first connection so the server
            // can start issuing handle updates immediately.
            sessionResumption: sessionHandle ? { handle: sessionHandle } : {},
            // Use configured media resolution
            mediaResolution: chatSettings.mediaResolution
        };

        // Configure Thinking for Native Audio models if enabled in settings
        // Gemini 3.1 Flash Live uses thinkingLevel; Gemini 2.5 native audio/live
        // models still use thinkingBudget.
        if (isGemini31FlashLive) {
             liveConfig.thinkingConfig = {
                includeThoughts: true,
                thinkingLevel: chatSettings.thinkingLevel || 'MINIMAL',
             };
        } else if (chatSettings.thinkingBudget !== 0) {
             const thinkingConfig: any = {
                includeThoughts: true 
             };
             if (chatSettings.thinkingBudget > 0) {
                 thinkingConfig.thinkingBudget = chatSettings.thinkingBudget;
             }
             liveConfig.thinkingConfig = thinkingConfig;
        }

        return { liveConfig, tools };
    }, [chatSettings, sessionHandle, clientFunctions]);
};
