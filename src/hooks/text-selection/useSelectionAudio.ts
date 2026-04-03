
import { useState, useRef, useEffect } from 'react';

export const useSelectionAudio = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const play = (url: string) => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
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
        audioRef
    };
};
