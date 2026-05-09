import { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../../../types';
import { logService } from '../../../services/logService';
import { getApiKeyErrorTranslationKey, getKeyForRequest } from '../../../utils/apiUtils';
import { transcribeAudioApi } from '../../../services/api/generation/audioApi';
import { useI18n } from '../../../contexts/I18nContext';

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
  const { t } = useI18n();
  const handleTranscribeAudio = useCallback(
    async (audioFile: File): Promise<string | null> => {
      logService.info('Starting transcription process...');
      setAppFileError(null);

      const keyResult = getKeyForRequest(appSettings, currentChatSettings);
      if ('error' in keyResult) {
        const translationKey = getApiKeyErrorTranslationKey(keyResult.error);
        setAppFileError(translationKey ? t(translationKey) : keyResult.error);
        logService.error('Transcription failed: API key error.', { error: keyResult.error });
        return null;
      }

      if (keyResult.isNewKey) {
        const fileRequiresApi = selectedFiles.some((f) => f.fileUri);
        if (!fileRequiresApi) {
          logService.info('New API key selected for this session due to transcription.');
          setCurrentChatSettings((prev) => ({ ...prev, lockedApiKey: keyResult.key }));
        }
      }

      try {
        const modelToUse = appSettings.transcriptionModelId || 'models/gemini-flash-latest';
        const transcribedText = await transcribeAudioApi(keyResult.key, audioFile, modelToUse);
        return transcribedText;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('transcription_unknown_error');
        setAppFileError(t('transcription_failedWithMessage').replace('{message}', errorMessage));
        logService.error('Transcription failed in handler', { error });
        return null;
      }
    },
    [appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError, selectedFiles, t],
  );

  return { handleTranscribeAudio };
};
