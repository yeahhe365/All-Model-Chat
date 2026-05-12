import React from 'react';
import { PhoneOff, AudioWaveform, Mic, MicOff, MonitorUp, Video, VideoOff } from 'lucide-react';
import { CHAT_INPUT_BUTTON_CLASS } from '@/constants/appConstants';
import { useChatInputActionsContext } from '@/components/chat/input/ChatInputContext';
import { useI18n } from '@/contexts/I18nContext';

export const LiveControls: React.FC = () => {
  const {
    isLiveConnected,
    isLiveMuted,
    onStartLiveSession,
    onDisconnectLiveSession,
    onToggleLiveMute,
    onStartLiveCamera,
    onStartLiveScreenShare,
    onStopLiveVideo,
    liveVideoSource,
    disabled,
    isRecording,
    isTranscribing,
  } = useChatInputActionsContext();
  const { t } = useI18n();
  const micIconSize = 20;
  const handleSessionClick = isLiveConnected ? onDisconnectLiveSession : onStartLiveSession;
  const cameraLabel = t('live_start_camera');
  const screenShareLabel = t('live_start_screen_share');
  const stopVideoLabel = t('live_stop_video');
  const muteLabel = isLiveMuted ? t('live_unmute_microphone') : t('live_mute_microphone');
  const sessionLabel = isLiveConnected ? t('live_end_session') : t('live_start_session');

  return (
    <>
      {onStartLiveCamera && (
        <button
          type="button"
          onClick={onStartLiveCamera}
          disabled={disabled || liveVideoSource === 'camera'}
          className={`${CHAT_INPUT_BUTTON_CLASS} ${liveVideoSource === 'camera' ? 'bg-purple-500/10 text-purple-500' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
          aria-label={cameraLabel}
          title={cameraLabel}
        >
          <Video size={micIconSize} strokeWidth={2} />
        </button>
      )}

      {onStartLiveScreenShare && (
        <button
          type="button"
          onClick={onStartLiveScreenShare}
          disabled={disabled || liveVideoSource === 'screen'}
          className={`${CHAT_INPUT_BUTTON_CLASS} ${liveVideoSource === 'screen' ? 'bg-purple-500/10 text-purple-500' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
          aria-label={screenShareLabel}
          title={screenShareLabel}
        >
          <MonitorUp size={micIconSize} strokeWidth={2} />
        </button>
      )}

      {liveVideoSource && onStopLiveVideo && (
        <button
          type="button"
          onClick={onStopLiveVideo}
          disabled={disabled}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-red-500/10 text-red-500 hover:bg-red-500/20`}
          aria-label={stopVideoLabel}
          title={stopVideoLabel}
        >
          <VideoOff size={micIconSize} strokeWidth={2} />
        </button>
      )}

      {/* Live Session Mute Button */}
      {isLiveConnected && onToggleLiveMute && (
        <button
          type="button"
          onClick={onToggleLiveMute}
          disabled={disabled}
          className={`${CHAT_INPUT_BUTTON_CLASS} ${isLiveMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
          aria-label={muteLabel}
          title={muteLabel}
        >
          {isLiveMuted ? <MicOff size={micIconSize} strokeWidth={2} /> : <Mic size={micIconSize} strokeWidth={2} />}
        </button>
      )}

      {/* Live Session Button */}
      {!isRecording && !isTranscribing && (
        <button
          type="button"
          onClick={handleSessionClick}
          disabled={disabled}
          className={`${CHAT_INPUT_BUTTON_CLASS} ${isLiveConnected ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 animate-pulse' : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'}`}
          aria-label={sessionLabel}
          title={sessionLabel}
        >
          {isLiveConnected ? (
            <PhoneOff size={micIconSize} strokeWidth={2} />
          ) : (
            <AudioWaveform size={micIconSize} strokeWidth={2} />
          )}
        </button>
      )}
    </>
  );
};
