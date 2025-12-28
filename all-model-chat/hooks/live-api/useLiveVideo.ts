
import { useState, useRef, useCallback, useEffect } from 'react';
import { logService } from '../../utils/appUtils';

export const useLiveVideo = () => {
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const startVideo = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            setVideoStream(stream);
        } catch (err) {
            logService.error("Failed to start video", err);
        }
    }, []);

    const stopVideo = useCallback(() => {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            setVideoStream(null);
        }
    }, [videoStream]);

    const captureFrame = useCallback((): string | null => {
        const videoEl = videoRef.current;
        if (!videoEl || videoEl.paused || videoEl.ended) return null;

        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0);

        // Convert to JPEG Base64 with moderate quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        return dataUrl.split(',')[1];
    }, []);

    // Sync video element with stream
    useEffect(() => {
        if (videoRef.current && videoStream) {
            videoRef.current.srcObject = videoStream;
        }
    }, [videoStream]);

    return {
        videoStream,
        videoRef,
        startVideo,
        stopVideo,
        captureFrame
    };
};
