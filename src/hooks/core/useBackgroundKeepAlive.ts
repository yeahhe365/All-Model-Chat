import { useEffect, useRef } from 'react';
import { logService } from '@/services/logService';

export const useBackgroundKeepAlive = (isActive: boolean) => {
  const workerRef = useRef<Worker | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isActive) {
      // 1. Web Worker Keep-Alive
      try {
        if (!workerRef.current) {
          workerRef.current = new Worker(new URL('./backgroundKeepAliveWorker.ts', import.meta.url), {
            type: 'module',
          });
          workerRef.current.onmessage = () => {
            // The message event wakes up the main thread
          };
          logService.debug('[KeepAlive] Worker started');
        }
        workerRef.current.postMessage('start');
      } catch (e) {
        logService.error('Failed to start KeepAlive worker', e);
      }

      // 2. Silent Audio Keep-Alive (Force High Priority Network)
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            // 100Hz sine wave
            osc.type = 'sine';
            osc.frequency.setValueAtTime(100, ctx.currentTime);

            // Inaudible gain (0.0001) prevents user hearing it but tricks browser
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();

            audioCtxRef.current = ctx;
            logService.debug('[KeepAlive] Silent audio active');
          }
        }
        // Resume if suspended (browser policy)
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
      } catch (e) {
        logService.error('Failed to start KeepAlive audio', e);
      }
    } else {
      // Stop Worker
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
      }

      // Stop Audio
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
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
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);
};
