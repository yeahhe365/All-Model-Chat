import { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession } from '../types';
import { getKeyForRequest, logService, pcmBase64ToWavUrl } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface TextToSpeechHandlerProps {
    appSettings: AppSettings;
    currentChatSettings: IndividualChatSettings;
    ttsMessageId: string | null;
    setTtsMessageId: (id: string | null) => void;
    updateAndPersistSessions: SessionsUpdater;
}

export const useTextToSpeechHandler = ({
    appSettings,
    currentChatSettings,
    ttsMessageId,
    setTtsMessageId,
    updateAndPersistSessions
}: TextToSpeechHandlerProps) => {

    const handleTextToSpeech = useCallback(async (messageId: string, text: string) => {
        if (ttsMessageId) return; 

        const keyResult = getKeyForRequest(appSettings, currentChatSettings);
        if ('error' in keyResult) {
            logService.error("TTS failed:", { error: keyResult.error });
            return;
        }
        const { key } = keyResult;
        
        setTtsMessageId(messageId);
        logService.info("Requesting TTS for message", { messageId });
        const modelId = 'models/gemini-2.5-flash-preview-tts';
        const voice = appSettings.ttsVoice;
        const abortController = new AbortController();

        try {
            const base64Pcm = await geminiServiceInstance.generateSpeech(key, modelId, text, voice, abortController.signal);
            const wavUrl = pcmBase64ToWavUrl(base64Pcm);
            
            updateAndPersistSessions(prev => prev.map(s => {
                if(s.messages.some(m => m.id === messageId)) {
                    return {...s, messages: s.messages.map(m => m.id === messageId ? {...m, audioSrc: wavUrl} : m)};
                }
                return s;
            }));

        } catch (error) {
            logService.error("TTS generation failed:", { messageId, error });
        } finally {
            setTtsMessageId(null);
        }
    }, [appSettings, currentChatSettings, ttsMessageId, setTtsMessageId, updateAndPersistSessions]);

    return { handleTextToSpeech };
};