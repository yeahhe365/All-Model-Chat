
import { useEffect, useRef } from 'react';
import { logService } from '../../utils/appUtils';

const WORKER_CODE = `
let intervalId = null;
self.onmessage = function(e) {
  if (e.data === 'start') {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      self.postMessage('tick');
    }, 250); // 4Hz heartbeat to keep main thread awake
  } else if (e.data === 'stop') {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }
};
`;

export const useBackgroundKeepAlive = (isActive: boolean) => {
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        if (isActive) {
            try {
                if (!workerRef.current) {
                    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    workerRef.current = new Worker(url);
                    workerRef.current.onmessage = () => {
                        // The message event wakes up the main thread
                        // No specific action needed, just the event firing is enough
                    };
                    URL.revokeObjectURL(url);
                    logService.debug('[KeepAlive] Worker started to prevent background throttling');
                }
                workerRef.current.postMessage('start');
            } catch (e) {
                console.error("Failed to start KeepAlive worker", e);
            }
        } else {
            if (workerRef.current) {
                workerRef.current.postMessage('stop');
            }
        }
    }, [isActive]);

    // Full cleanup on unmount
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);
};
