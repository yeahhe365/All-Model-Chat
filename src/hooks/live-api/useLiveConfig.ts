import { useMemo } from 'react';
import { ChatSettings } from '../../types';
import type { Tool } from '@google/genai';
import type { LiveClientFunctions } from '../../types';
import { LOCAL_PYTHON_SYSTEM_PROMPT } from '@/features/prompts/localPython';

interface UseLiveConfigProps {
  chatSettings: ChatSettings;
  sessionHandle: string | null;
  clientFunctions?: LiveClientFunctions;
}

interface LiveConfig {
  responseModalities: ['AUDIO'];
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: string;
      };
    };
  };
  systemInstruction?: { parts: Array<{ text: string }> };
  tools?: Tool[];
  inputAudioTranscription: Record<string, never>;
  outputAudioTranscription: Record<string, never>;
  contextWindowCompression: {
    slidingWindow: Record<string, never>;
  };
  sessionResumption: { handle: string } | Record<string, never>;
  mediaResolution?: ChatSettings['mediaResolution'];
  thinkingConfig?: {
    includeThoughts: boolean;
    thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
    thinkingBudget?: number;
  };
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

    const functionDeclarations = Object.values(clientFunctions ?? {}).map(({ declaration }) => declaration);
    if (functionDeclarations.length > 0) {
      tools.push({ functionDeclarations });
    }

    const hasLocalPythonTool = functionDeclarations.some((declaration) => declaration.name === 'run_local_python');
    const effectiveSystemInstruction = hasLocalPythonTool
      ? chatSettings.systemInstruction
        ? `${chatSettings.systemInstruction}\n\n${LOCAL_PYTHON_SYSTEM_PROMPT}`
        : LOCAL_PYTHON_SYSTEM_PROMPT
      : chatSettings.systemInstruction;

    // Build Config
    const liveConfig: LiveConfig = {
      // Use string literal 'AUDIO' for better compatibility in Live API JSON serialization
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: chatSettings.ttsVoice || 'Zephyr' } },
      },
      // Fix: systemInstruction must be a Content object { parts: [{ text: ... }] } for Live API
      systemInstruction: effectiveSystemInstruction ? { parts: [{ text: effectiveSystemInstruction }] } : undefined,
      tools: tools.length > 0 ? tools : undefined,
      // Enable transcription for both input and output
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      // Enable Context Compression for long conversations
      contextWindowCompression: {
        slidingWindow: {},
      },
      // Enable session resumption from the first connection so the server
      // can start issuing handle updates immediately.
      sessionResumption: sessionHandle ? { handle: sessionHandle } : {},
      // Use configured media resolution
      mediaResolution: chatSettings.mediaResolution,
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
      const thinkingConfig: NonNullable<LiveConfig['thinkingConfig']> = {
        includeThoughts: true,
      };
      if (chatSettings.thinkingBudget > 0) {
        thinkingConfig.thinkingBudget = chatSettings.thinkingBudget;
      }
      liveConfig.thinkingConfig = thinkingConfig;
    }

    return { liveConfig, tools };
  }, [chatSettings, sessionHandle, clientFunctions]);
};
