
import { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../../../types';
import { getKeyForRequest, logService, getTranslator } from '../../../utils/appUtils';
import { geminiServiceInstance } from '../../../services/geminiService';

interface UseAudioActionsProps {
    appSettings: AppSettings;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
    setAppFileError: (error: string | null) => void;
    selectedFiles: UploadedFile[];
}

export const useAudioActions = ({
    appSettings,
    currentChatSettings,
    setCurrentChatSettings,
    setAppFileError,
    selectedFiles,
}: UseAudioActionsProps) => {

    const handleTranscribeAudio = useCallback(async (audioFile: File): Promise<string | null> => {
        logService.info('Starting transcription process...');
        setAppFileError(null);
        
        const keyResult = getKeyForRequest(appSettings, currentChatSettings);
        if ('error' in keyResult) {
            setAppFileError(keyResult.error);
            logService.error('Transcription failed: API key error.', { error: keyResult.error });
            return null;
        }
        
        if (keyResult.isNewKey) {
            const fileRequiresApi = selectedFiles.some(f => f.fileUri);
            if (!fileRequiresApi) {
                logService.info('New API key selected for this session due to transcription.');
                setCurrentChatSettings(prev => ({...prev, lockedApiKey: keyResult.key }));
            }
        }

        // Get localized prompt for ASR
        const effectiveLanguage = appSettings.language === 'system'
            ? (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en')
            : (appSettings.language as 'en' | 'zh');
        const t = getTranslator(effectiveLanguage);
        const prompt = t('suggestion_asr_desc');
    
        try {
            const modelToUse = appSettings.transcriptionModelId || 'models/gemini-flash-latest';
            const transcribedText = await geminiServiceInstance.transcribeAudio(
                keyResult.key,
                audioFile,
                modelToUse,
                prompt
            );
            return transcribedText;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setAppFileError(`Transcription failed: ${errorMessage}`);
            logService.error('Transcription failed in handler', { error });
            return null;
        }
    }, [appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError, selectedFiles]);

    return { handleTranscribeAudio };
};