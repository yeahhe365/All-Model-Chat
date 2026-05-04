import { useState, useRef, useEffect } from 'react';
import { releaseManagedObjectUrl } from '../../services/objectUrlManager';

export const useSelectionAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      releaseManagedObjectUrl(audioUrl);
    };
  }, [audioUrl]);

  const play = (url: string) => {
    setAudioUrl(url);
    setIsPlaying(true);
  };

  const stop = () => {
    setIsPlaying(false);
    setAudioUrl(null);
  };

  return {
    isPlaying,
    isLoading,
    audioUrl,
    setIsLoading,
    play,
    stop,
    audioRef,
  };
};
