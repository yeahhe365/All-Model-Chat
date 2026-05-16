import React, { useState } from 'react';
import { GripVertical, X, Loader2, Pause, Play } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface AudioPlayerViewProps {
  audioUrl: string | null;
  isLoading: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  onDragStart: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
}

export const AudioPlayerView: React.FC<AudioPlayerViewProps> = ({
  audioUrl,
  isLoading,
  audioRef,
  onDragStart,
  onClose,
}) => {
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const formatTime = (time: number) => {
    if (!time || Number.isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(e.target.value);
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-primary)]">
        <Loader2 size={14} className="animate-spin text-[var(--theme-text-link)]" />
        <span>{t('generating_audio')}</span>
      </div>
    );
  }

  if (!audioUrl) return null;

  return (
    <div className="flex w-[min(22rem,calc(100vw-2rem))] items-center gap-2 pl-1 pr-2 py-1">
      <div
        onMouseDown={onDragStart}
        className="cursor-grab active:cursor-grabbing p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors touch-none"
        title={t('drag_to_move')}
      >
        <GripVertical size={14} />
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay
        className="hidden"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <button
        type="button"
        onClick={togglePlayback}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] transition-colors hover:bg-[var(--theme-bg-input)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
        aria-label={isPlaying ? t('audioPlayer_pause') : t('audioPlayer_play')}
      >
        {isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          disabled={!duration}
          className="h-1 min-w-0 flex-1 accent-[var(--theme-text-link)]"
          aria-label={t('audioPlayer_playback_progress')}
        />
        <span className="w-16 flex-shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--theme-text-tertiary)]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <button
        onClick={onClose}
        className="p-1.5 rounded-full text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] ml-1"
        aria-label={t('close')}
      >
        <X size={16} />
      </button>
    </div>
  );
};
