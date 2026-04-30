import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AppSettings, ChatSettings } from '../../types/settings';
import { geminiServiceInstance } from '../../services/geminiService';
import { getKeyForRequest } from '../../utils/apiUtils';

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
  const handleTranslate = useCallback(async () => {
    if (!inputText.trim() || isTranslating) {
      return;
    }

    setTranslating(true);
    setAppFileError(null);

    const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
    if ('error' in keyResult) {
      setAppFileError(keyResult.error);
      setTranslating(false);
      return;
    }

    try {
      const translatedText = await geminiServiceInstance.translateText(
        keyResult.key,
        inputText,
        appSettings.translationTargetLanguage ?? 'English',
        appSettings.inputTranslationModelId,
      );
      setInputText(translatedText);
    } catch (error) {
      setAppFileError(error instanceof Error ? error.message : 'Translation failed.');
    } finally {
      setTranslating(false);
    }
  }, [
    appSettings,
    currentChatSettings,
    inputText,
    isTranslating,
    setAppFileError,
    setInputText,
    setTranslating,
  ]);

  return { handleTranslate };
};
