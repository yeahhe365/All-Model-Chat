import { useRef, useEffect, useMemo } from 'react';
import type { Part, Session as LiveSession } from '@google/genai';
import type { AppSettings, ChatSettings, LiveClientFunctions, UploadedFile } from '../types';
import { useLiveAudio } from './live-api/useLiveAudio';
import { useLiveVideo } from './live-api/useLiveVideo';
import { useLiveConfig } from './live-api/useLiveConfig';
import { useLiveMessageProcessing } from './live-api/useLiveMessageProcessing';
import { useLiveConnection } from './live-api/useLiveConnection';
import { useLiveFrameCapture } from './live-api/useLiveFrameCapture';
import { resolveLiveErrorText } from './live-api/liveErrorState';
import { useBackgroundKeepAlive } from './core/useBackgroundKeepAlive';
import { useI18n } from '../contexts/I18nContext';
import { getKeyForRequest, SERVER_MANAGED_API_KEY } from '../utils/apiUtils';
import { useStateWithRef } from './useStateWithRef';

interface UseLiveAPIProps {
  appSettings: AppSettings;
  chatSettings: ChatSettings;
  modelId: string;
  onClose?: () => void;
  onTranscript?: (
    text: string,
    role: 'user' | 'model',
    isFinal: boolean,
    type?: 'content' | 'thought',
    audioUrl?: string | null,
    generatedFiles?: UploadedFile[],
    apiPart?: Part,
  ) => void;
  onGeneratedFiles?: (files: UploadedFile[]) => void;
  clientFunctions?: LiveClientFunctions;
}

export const useLiveAPI = ({
  appSettings,
  chatSettings,
  modelId,
  onClose,
  onTranscript,
  onGeneratedFiles,
  clientFunctions,
}: UseLiveAPIProps) => {
  const { t } = useI18n();
  const sessionRef = useRef<Promise<LiveSession> | null>(null);
  const goAwayHandlerRef = useRef<(goAway: { timeLeft?: string }) => void>(() => {});

  // Session Resumption State
  const [sessionHandle, setSessionHandle, sessionHandleRef] = useStateWithRef<string | null>(null);

  // 1. Audio Management Hook
  const { volume, isSpeaking, isMuted, toggleMute, initializeAudio, playAudioChunk, stopAudioPlayback, cleanupAudio } =
    useLiveAudio();

  // 2. Video Management Hook
  const { videoStream, videoSource, videoRef, startCamera, startScreenShare, stopVideo, captureFrame } = useLiveVideo();

  // 3. Configuration Hook
  const { liveConfig, tools } = useLiveConfig({
    chatSettings,
    sessionHandle,
    clientFunctions,
  });
  const liveApiKeyForConnection = useMemo(() => {
    const keyResult = getKeyForRequest(appSettings, chatSettings, {
      skipIncrement: true,
      skipUsageLogging: true,
    });
    if ('error' in keyResult || keyResult.key === SERVER_MANAGED_API_KEY) {
      return null;
    }

    return keyResult.key;
  }, [appSettings, chatSettings]);

  // 4. Message Processing Hook
  const { handleMessage, clearBufferedAudio } = useLiveMessageProcessing({
    playAudioChunk,
    stopAudioPlayback,
    onTranscript,
    onGoAway: (goAway) => goAwayHandlerRef.current(goAway),
    onGeneratedFiles,
    clientFunctions,
    sessionRef,
    setSessionHandle,
    sessionHandleRef,
  });

  // 5. Connection Management Hook
  const { isConnected, isReconnecting, errorState, connect, handleGoAway, disconnect, sendText, sendContent } =
    useLiveConnection({
      appSettings,
      modelId,
      liveConfig,
      liveApiKeyForConnection,
      tools,
      initializeAudio,
      cleanupAudio,
      clearBufferedAudio,
      stopVideo,
      handleMessage,
      onClose,
      onTranscript,
      setSessionHandle,
      sessionHandleRef,
      sessionRef,
    });
  useEffect(() => {
    goAwayHandlerRef.current = handleGoAway;
  }, [handleGoAway]);

  const error = useMemo(() => resolveLiveErrorText(errorState, t), [errorState, t]);

  // 6. Frame Capture Hook
  useLiveFrameCapture({
    isConnected,
    videoStream,
    videoSource,
    volume,
    isMuted,
    captureFrame,
    sessionRef,
  });

  // Prevent background throttling when connected
  useBackgroundKeepAlive(isConnected);

  return useMemo(
    () => ({
      isConnected,
      isSpeaking,
      isMuted,
      toggleMute,
      error,
      volume,
      connect,
      disconnect,
      sendText,
      sendContent,
      videoStream,
      videoSource,
      startCamera,
      startScreenShare,
      stopVideo,
      videoRef,
      isReconnecting,
    }),
    [
      isConnected,
      isSpeaking,
      isMuted,
      toggleMute,
      error,
      volume,
      connect,
      disconnect,
      sendText,
      sendContent,
      videoStream,
      videoSource,
      startCamera,
      startScreenShare,
      stopVideo,
      videoRef,
      isReconnecting,
    ],
  );
};
