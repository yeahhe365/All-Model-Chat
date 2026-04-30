import { useCallback } from 'react';
import type { UploadedFile } from '../../types';
import type { MediaResolution } from '../../types/settings';
import { buildContentParts } from '../../utils/chat/builder';

type SetSelectedFiles = (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;

export interface LiveModeApi {
  isConnected: boolean;
  connect: () => Promise<boolean>;
  sendText: (text: string) => Promise<boolean>;
  sendContent: (parts: Awaited<ReturnType<typeof buildContentParts>>['contentParts']) => Promise<boolean>;
}

interface UseLiveModeHandlerParams {
  isNativeAudioModel: boolean;
  selectedFiles: UploadedFile[];
  setSelectedFiles: SetSelectedFiles;
  currentModelId: string;
  mediaResolution?: MediaResolution;
  liveAPI: LiveModeApi;
  onAddUserMessage?: (text: string, files?: UploadedFile[]) => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => void;
}

export const useLiveModeHandler = ({
  isNativeAudioModel,
  selectedFiles,
  setSelectedFiles,
  currentModelId,
  mediaResolution,
  liveAPI,
  onAddUserMessage,
  onSendMessage,
}: UseLiveModeHandlerParams) => {
  const handleSmartSendMessage = useCallback(
    async (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => {
      if (!isNativeAudioModel) {
        onSendMessage(text, options);
        return;
      }

      const filesToSend = options?.files ?? selectedFiles;
      let didConnect = liveAPI.isConnected;
      if (!liveAPI.isConnected) {
        try {
          didConnect = await liveAPI.connect();
        } catch (error) {
          console.error('Failed to auto-connect Live API:', error);
          return;
        }
      }

      if (!didConnect) {
        return;
      }

      let enrichedFiles = filesToSend;
      let didSend: boolean;
      if (filesToSend.length > 0) {
        const builtContent = await buildContentParts(text, filesToSend, currentModelId, mediaResolution);
        enrichedFiles = builtContent.enrichedFiles;
        didSend = await liveAPI.sendContent(builtContent.contentParts);
      } else {
        didSend = await liveAPI.sendText(text);
      }

      if (!didSend) {
        return;
      }

      onAddUserMessage?.(text, enrichedFiles);
      setSelectedFiles([]);
    },
    [
      currentModelId,
      isNativeAudioModel,
      liveAPI,
      mediaResolution,
      onAddUserMessage,
      onSendMessage,
      selectedFiles,
      setSelectedFiles,
    ],
  );

  return { handleSmartSendMessage };
};
