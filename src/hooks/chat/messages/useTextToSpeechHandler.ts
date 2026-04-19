
import { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings } from '../../../types';
import { getKeyForRequest, logService, pcmBase64ToWavUrl } from '../../../utils/appUtils';
import { geminiServiceInstance } from '../../../services/geminiService';
import { DEFAULT_TTS_MODEL_ID } from '../../../constants/appConstants';

interface TextToSpeechHandlerProps {
    appSettings: AppSettings;
    currentChatSettings: IndividualChatSettings;
}

export const useTextToSpeechHandler = ({
    appSettings,
    currentChatSettings,
}: TextToSpeechHandlerProps) => {

    const handleQuickTTS = useCallback(async (text: string): Promise<string | null> => {
        const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
        if ('error' in keyResult) {
            logService.error("Quick TTS failed:", { error: keyResult.error });
            return null;
        }
        const { key } = keyResult;

        logService.info("Requesting Quick TTS for selected text");
        const modelId = currentChatSettings.modelId.includes('-tts')
            ? currentChatSettings.modelId
            : DEFAULT_TTS_MODEL_ID;
        const voice = appSettings.ttsVoice;
        const abortController = new AbortController();

        try {
            const base64Pcm = await geminiServiceInstance.generateSpeech(key, modelId, text, voice, abortController.signal);
            return pcmBase64ToWavUrl(base64Pcm);
        } catch (error) {
            logService.error("Quick TTS generation failed:", { error });
            return null;
        }
    }, [appSettings, currentChatSettings]);

    return { handleQuickTTS };
};
