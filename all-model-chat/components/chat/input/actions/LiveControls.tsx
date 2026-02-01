import React from 'react';
import { PhoneOff, AudioWaveform, Mic, MicOff } from 'lucide-react';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';

interface LiveControlsProps {
    isLiveConnected: boolean;
    isLiveMuted?: boolean;
    onStartLiveSession: () => void;
    onToggleLiveMute?: () => void;
    disabled: boolean;
    isRecording: boolean;
    isTranscribing: boolean;
}

export const LiveControls: React.FC<LiveControlsProps> = ({
    isLiveConnected,
    isLiveMuted,
    onStartLiveSession,
    onToggleLiveMute,
    disabled,
    isRecording,
    isTranscribing
}) => {
    const micIconSize = 20;

    return (
        <>
            {/* Live Session Mute Button */}
            {isLiveConnected && onToggleLiveMute && (
                <button
                    type="button"
                    onClick={onToggleLiveMute}
                    disabled={disabled}
                    className={`${CHAT_INPUT_BUTTON_CLASS} ${isLiveMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
                    aria-label={isLiveMuted ? "Unmute Microphone" : "Mute Microphone"}
                    title={isLiveMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                     {isLiveMuted ? <MicOff size={micIconSize} strokeWidth={2} /> : <Mic size={micIconSize} strokeWidth={2} />}
                </button>
            )}

            {/* Live Session Button */}
            {!isRecording && !isTranscribing && (
                <button
                    type="button"
                    onClick={onStartLiveSession}
                    disabled={disabled}
                    className={`${CHAT_INPUT_BUTTON_CLASS} ${isLiveConnected ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 animate-pulse' : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'}`}
                    aria-label={isLiveConnected ? "End Live Session" : "Start Live Session"}
                    title={isLiveConnected ? "End Live Session" : "Start Live Session"}
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