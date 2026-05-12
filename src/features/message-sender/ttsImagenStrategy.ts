import type { AppSettings, ChatSettings as IndividualChatSettings } from '@/types';
import type { ImagePersonGeneration } from '@/types/settings';
import { generateSpeechApi } from '@/services/api/generation/audioApi';
import { generateImagesApi } from '@/services/api/generation/imageApi';
import { pcmBase64ToWavUrl } from '@/features/audio/audioProcessing';
import { createUploadedFileFromBase64 } from '@/utils/chat/parsing';
import { formatMessageSenderText } from './i18nFormat';
import { runOptimisticMessagePipeline } from './messagePipeline';
import type { MessageSenderTranslator, SessionsUpdater } from './types';

type MessageLifecycleRunner = Parameters<typeof runOptimisticMessagePipeline>[0]['runMessageLifecycle'];

interface SendTtsImagenMessageParams {
  keyToUse: string;
  activeSessionId: string | null;
  generationId: string;
  abortController: AbortController;
  appSettings: AppSettings;
  currentChatSettings: IndividualChatSettings;
  text: string;
  aspectRatio: string;
  imageSize: string | undefined;
  personGeneration: ImagePersonGeneration;
  shouldLockKey?: boolean;
  updateAndPersistSessions: SessionsUpdater;
  setActiveSessionId: (id: string | null) => void;
  runMessageLifecycle: MessageLifecycleRunner;
  t: MessageSenderTranslator;
}

export const sendTtsImagenMessage = async ({
  keyToUse,
  activeSessionId,
  generationId,
  abortController,
  appSettings,
  currentChatSettings,
  text,
  aspectRatio,
  imageSize,
  personGeneration,
  shouldLockKey,
  updateAndPersistSessions,
  setActiveSessionId,
  runMessageLifecycle,
  t,
}: SendTtsImagenMessageParams) => {
  const isTtsModel = currentChatSettings.modelId.includes('-tts');

  await runOptimisticMessagePipeline({
    activeSessionId,
    appSettings,
    currentChatSettings,
    updateAndPersistSessions,
    setActiveSessionId,
    text,
    generationId,
    shouldLockKey,
    keyToLock: keyToUse,
    abortController,
    errorPrefix: isTtsModel ? t('messageSender_ttsErrorPrefix') : t('messageSender_imageGenErrorPrefix'),
    runMessageLifecycle,
    execute: async () => {
      if (isTtsModel) {
        const base64Pcm = await generateSpeechApi(
          keyToUse,
          currentChatSettings.modelId,
          text,
          currentChatSettings.ttsVoice,
          abortController.signal,
        );
        if (abortController.signal.aborted) throw new Error('aborted');
        const wavUrl = pcmBase64ToWavUrl(base64Pcm);

        return {
          patch: {
            isLoading: false,
            content: text,
            audioSrc: wavUrl,
            audioAutoplay: true,
            generationEndTime: new Date(),
          },
          feedback: {
            notification: {
              title: t('messageSender_audioReadyTitle'),
              body: t('messageSender_audioReadyBody'),
            },
          },
        };
      }

      const imageBase64Array = await generateImagesApi(
        keyToUse,
        currentChatSettings.modelId,
        text,
        aspectRatio,
        imageSize,
        abortController.signal,
        {
          numberOfImages: appSettings.generateQuadImages ? 4 : 1,
          personGeneration,
        },
      );

      if (abortController.signal.aborted) throw new Error('aborted');

      const generatedFiles = imageBase64Array.map((base64Data, index) =>
        createUploadedFileFromBase64(base64Data, 'image/png', `generated-image-${index + 1}`),
      );

      return {
        patch: {
          isLoading: false,
          content: formatMessageSenderText(t('messageSender_generatedImagesForPrompt'), {
            count: generatedFiles.length,
            prompt: text,
          }),
          files: generatedFiles,
          generationEndTime: new Date(),
        },
        feedback: {
          notification: {
            title: t('messageSender_imageReadyTitle'),
            body: t('messageSender_imageReadyBody'),
          },
        },
      };
    },
  });
};
