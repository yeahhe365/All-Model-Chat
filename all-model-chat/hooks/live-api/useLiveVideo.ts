
import { useState, useRef, useCallback, useEffect } from 'react';
import { logService } from '../../utils/appUtils';

export type VideoSource = 'camera' | 'screen' | null;

export const useLiveVideo = () => {
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const [videoSource, setVideoSource] = useState<VideoSource>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const stopVideo = useCallback(() => {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            setVideoStream(null);
            setVideoSource(null);
        }
    }, [videoStream]);

    const startCamera = useCallback(async () => {
        if (videoSource === 'camera') return;
        
        // Stop existing stream if any (e.g. screen share)
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            setVideoStream(stream);
            setVideoSource('camera');
        } catch (err) {
            logService.error("Failed to start camera", err);
        }
    }, [videoStream, videoSource]);

    const startScreenShare = useCallback(async () => {
        if (videoSource === 'screen') return;

        // Stop existing stream if any (e.g. camera)
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false // Audio is handled separately by useLiveAudio
            });
            setVideoStream(stream);
            setVideoSource('screen');

            // Handle user stopping screen share via browser UI
            stream.getVideoTracks()[0].onended = () => {
                setVideoStream(null);
                setVideoSource(null);
            };

        } catch (err) {
            logService.error("Failed to start screen share", err);
        }
    }, [videoStream, videoSource]);

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
        videoSource,
        videoRef,
        startCamera,
        startScreenShare,
        stopVideo,
        captureFrame
    };
};
