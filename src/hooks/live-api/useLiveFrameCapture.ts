
import { useEffect, useRef } from 'react';
import type { Session as LiveSession } from '@google/genai';

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
                    try {
                        session.sendRealtimeInput({
                            video: {
                                mimeType: 'image/jpeg',
                                data: base64Data
                            }
                        });
                    } catch {
                        // Ignore transient sends racing with session teardown.
                    }
                });
            }
        };

        // Live API docs recommend a maximum of 1 frame per second.
        frameIntervalRef.current = window.setInterval(sendFrame, 1000);

        return () => {
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        };
    }, [isConnected, videoStream, captureFrame, sessionRef]);
};
