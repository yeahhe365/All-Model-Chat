
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';
import { triggerDownload } from '../../utils/exportUtils';

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, autoPlay = false, className = '' }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Auto-play prevented:", error);
                setIsPlaying(false);
            });
        }
    }
  }, [autoPlay, src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoaded(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newRate = speeds[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) audioRef.current.playbackRate = newRate;
  };

  const handleDownload = () => {
      triggerDownload(src, `audio-${Date.now()}.wav`);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex flex-col w-full max-w-sm bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center justify-between p-3 gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] transition-transform active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] flex-shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Progress & Time */}
        <div className="flex-grow flex flex-col justify-center gap-1 min-w-0">
            {/* Progress Bar */}
            <div className="relative w-full h-1 bg-[var(--theme-border-secondary)] rounded-full cursor-pointer group">
                <div 
                    className="absolute top-0 left-0 h-full bg-[var(--theme-text-link)] transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${progressPercent}%` }}
                />
                {/* Thumb/Handle - visible on hover */}
                <div 
                    className="absolute top-1/2 -mt-1.5 h-3 w-3 bg-[var(--theme-text-link)] rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform -translate-x-1/2"
                    style={{ left: `${progressPercent}%` }}
                />
                <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={!isLoaded}
                />
            </div>
            
            <div className="flex justify-between text-[10px] font-mono text-[var(--theme-text-tertiary)] tabular-nums select-none">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>

        {/* Controls Group */}
        <div className="flex items-center gap-1 flex-shrink-0">
             {/* Speed Toggle */}
            <button
                onClick={toggleSpeed}
                className="px-1.5 py-1 rounded text-[10px] font-bold text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors min-w-[2rem]"
                title="Playback Speed"
            >
                {playbackRate}x
            </button>
            
            {/* Download */}
            <button
                onClick={handleDownload}
                className="p-1.5 rounded text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                title="Download Audio"
            >
                <Download size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};
