import React, { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings } from '../../types';
import type { ImagePersonGeneration } from '../../types/settings';
import { generateSpeechApi } from '../../services/api/generation/audioApi';
import { generateImagesApi } from '../../services/api/generation/imageApi';
import { pcmBase64ToWavUrl } from '../../utils/audio/audioProcessing';
import { createUploadedFileFromBase64 } from '../../utils/chat/parsing';
import { showNotification, playCompletionSound } from '../../utils/uiUtils';
import { useMessageLifecycle } from './useMessageLifecycle';
import { startOptimisticMessageTurn } from './messagePipeline';
import type { SessionsUpdater } from './types';

interface TtsImagenSenderProps {
  updateAndPersistSessions: SessionsUpdater;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
  activeJobs: React.MutableRefObject<Map<string, AbortController>>;
  setActiveSessionId: (id: string | null) => void;
}

export const useTtsImagenSender = ({
  updateAndPersistSessions,
  setSessionLoading,
  activeJobs,
  setActiveSessionId,
}: TtsImagenSenderProps) => {
  const { runMessageLifecycle } = useMessageLifecycle({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
  });

  const handleTtsImagenMessage = useCallback(
    async (
      keyToUse: string,
      activeSessionId: string | null,
      generationId: string,
      newAbortController: AbortController,
      appSettings: AppSettings,
      currentChatSettings: IndividualChatSettings,
      text: string,
      aspectRatio: string,
      imageSize: string | undefined,
      personGeneration: ImagePersonGeneration,
      options: { shouldLockKey?: boolean } = {},
    ) => {
      const isTtsModel = currentChatSettings.modelId.includes('-tts');
      const { finalSessionId, modelMessageId } = startOptimisticMessageTurn({
        activeSessionId,
        appSettings,
        currentChatSettings,
        updateAndPersistSessions,
        setActiveSessionId,
        text,
        generationId,
        shouldLockKey: options.shouldLockKey,
        keyToLock: keyToUse,
      });

      await runMessageLifecycle({
        sessionId: finalSessionId,
        generationId,
        abortController: newAbortController,
        modelMessageId,
        errorPrefix: isTtsModel ? 'TTS Error' : 'Image Gen Error',
        execute: async () => {
          if (isTtsModel) {
            const base64Pcm = await generateSpeechApi(
              keyToUse,
              currentChatSettings.modelId,
              text,
              currentChatSettings.ttsVoice,
              newAbortController.signal,
            );
            if (newAbortController.signal.aborted) throw new Error('aborted');
            const wavUrl = pcmBase64ToWavUrl(base64Pcm);

            updateAndPersistSessions((p) =>
              p.map((s) =>
                s.id === finalSessionId
                  ? {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === modelMessageId
                          ? {
                              ...m,
                              isLoading: false,
                              content: text,
                              audioSrc: wavUrl,
                              audioAutoplay: true,
                              generationEndTime: new Date(),
                            }
                          : m,
                      ),
                    }
                  : s,
              ),
            );

            if (appSettings.isCompletionSoundEnabled) {
              playCompletionSound();
            }

            if (appSettings.isCompletionNotificationEnabled && document.hidden) {
              const { APP_LOGO_SVG_DATA_URI } = await import('../../constants/assets');
              showNotification('Audio Ready', {
                body: 'Text-to-speech audio has been generated.',
                icon: APP_LOGO_SVG_DATA_URI,
              });
            }
          } else {
            // Imagen
            const imageBase64Array = await generateImagesApi(
              keyToUse,
              currentChatSettings.modelId,
              text,
              aspectRatio,
              imageSize,
              newAbortController.signal,
              {
                numberOfImages: appSettings.generateQuadImages ? 4 : 1,
                personGeneration,
              },
            );

            if (newAbortController.signal.aborted) throw new Error('aborted');

            const generatedFiles = imageBase64Array.map((base64Data, index) => {
              return createUploadedFileFromBase64(base64Data, 'image/png', `generated-image-${index + 1}`);
            });

            updateAndPersistSessions((p) =>
              p.map((s) =>
                s.id === finalSessionId
                  ? {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === modelMessageId
                          ? {
                              ...m,
                              isLoading: false,
                              content: `Generated ${generatedFiles.length} image(s) for: "${text}"`,
                              files: generatedFiles,
                              generationEndTime: new Date(),
                            }
                          : m,
                      ),
                    }
                  : s,
              ),
            );

            if (appSettings.isCompletionSoundEnabled) {
              playCompletionSound();
            }

            if (appSettings.isCompletionNotificationEnabled && document.hidden) {
              const { APP_LOGO_SVG_DATA_URI } = await import('../../constants/assets');
              showNotification('Image Ready', { body: 'Your image has been generated.', icon: APP_LOGO_SVG_DATA_URI });
            }
          }
        },
      });
    },
    [runMessageLifecycle, updateAndPersistSessions, setActiveSessionId],
  );

  return { handleTtsImagenMessage };
};
