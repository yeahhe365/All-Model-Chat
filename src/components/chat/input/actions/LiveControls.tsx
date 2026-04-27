import React from 'react';
import { PhoneOff, AudioWaveform, Mic, MicOff, MonitorUp, Video, VideoOff } from 'lucide-react';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';

interface LiveControlsProps {
  isLiveConnected: boolean;
  isLiveMuted?: boolean;
  onStartLiveSession: () => void;
  onDisconnectLiveSession?: () => void;
  onToggleLiveMute?: () => void;
  onStartLiveCamera?: () => void;
  onStartLiveScreenShare?: () => void;
  onStopLiveVideo?: () => void;
  liveVideoSource?: 'camera' | 'screen' | null;
  disabled: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
}

export const LiveControls: React.FC<LiveControlsProps> = ({
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
}) => {
  const micIconSize = 20;
  const handleSessionClick = isLiveConnected ? (onDisconnectLiveSession ?? onStartLiveSession) : onStartLiveSession;

  return (
    <>
      {onStartLiveCamera && (
        <button
          type="button"
          onClick={onStartLiveCamera}
          disabled={disabled || liveVideoSource === 'camera'}
          className={`${CHAT_INPUT_BUTTON_CLASS} ${liveVideoSource === 'camera' ? 'bg-purple-500/10 text-purple-500' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
          aria-label="Start Camera"
          title="Start Camera"
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
          aria-label="Start Screen Share"
          title="Start Screen Share"
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
          aria-label="Stop Live Video"
          title="Stop Live Video"
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
          aria-label={isLiveMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          title={isLiveMuted ? 'Unmute Microphone' : 'Mute Microphone'}
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
          aria-label={isLiveConnected ? 'End Live Session' : 'Start Live Session'}
          title={isLiveConnected ? 'End Live Session' : 'Start Live Session'}
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
