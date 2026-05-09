import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AppSettings, ChatSettings } from '../../types/settings';
import { translateTextApi } from '../../services/api/generation/textApi';
import { getApiKeyErrorTranslationKey, getGeminiKeyForRequest } from '../../utils/apiUtils';
import { useI18n } from '../../contexts/I18nContext';

interface UseChatInputTranslationParams {
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
  inputText: string;
  isTranslating: boolean;
  setInputText: Dispatch<SetStateAction<string>>;
  setTranslating: (isTranslating: boolean) => void;
  setAppFileError: (error: string | null) => void;
}

export const useChatInputTranslation = ({
  appSettings,
  currentChatSettings,
  inputText,
  isTranslating,
  setInputText,
  setTranslating,
  setAppFileError,
}: UseChatInputTranslationParams) => {
  const { t } = useI18n();
  const handleTranslate = useCallback(async () => {
    if (!inputText.trim() || isTranslating) {
      return;
    }

    setTranslating(true);
    setAppFileError(null);

    const keyResult = getGeminiKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
    if ('error' in keyResult) {
      const translationKey = getApiKeyErrorTranslationKey(keyResult.error);
      setAppFileError(translationKey ? t(translationKey) : keyResult.error);
      setTranslating(false);
      return;
    }

    try {
      const translatedText = await translateTextApi(
        keyResult.key,
        inputText,
        appSettings.translationTargetLanguage ?? 'English',
        appSettings.inputTranslationModelId,
      );
      setInputText(translatedText);
    } catch (error) {
      console.error('Input translation failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setAppFileError(t('translate_failed_with_message').replace('{message}', message));
    } finally {
      setTranslating(false);
    }
  }, [appSettings, currentChatSettings, inputText, isTranslating, setAppFileError, setInputText, setTranslating, t]);

  return { handleTranslate };
};
