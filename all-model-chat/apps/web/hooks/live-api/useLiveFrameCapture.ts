
import { useEffect, useRef } from 'react';
import { LiveSession } from '@google/genai';

interface UseLiveFrameCaptureProps {
    isConnected: boolean;
    videoStream: MediaStream | null;
    captureFrame: () => string | null;
    sessionRef: React.MutableRefObject<Promise<LiveSession> | null>;
}

export const useLiveFrameCapture = ({
    isConnected,
    videoStream,
    captureFrame,
    sessionRef
}: UseLiveFrameCaptureProps) => {
    const frameIntervalRef = useRef<number | null>(null);

    // Frame Capture Loop
    useEffect(() => {
        if (!isConnected || !videoStream) {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }
            return;
        }

        const sendFrame = () => {
            const base64Data = captureFrame();
            if (base64Data && sessionRef.current) {
                sessionRef.current.then(session => {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }
                    });
                });
            }
        };

        // 5 FPS = 200ms interval
        frameIntervalRef.current = window.setInterval(sendFrame, 200);

        return () => {
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        };
    }, [isConnected, videoStream, captureFrame, sessionRef]);
};
