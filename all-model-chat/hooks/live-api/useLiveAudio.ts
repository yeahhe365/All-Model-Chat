
import { useState, useRef, useCallback } from 'react';
import { audioWorkletCode } from '../../utils/audio/audioWorklet';
import { decodeBase64ToArrayBuffer, decodeAudioData } from '../../utils/audio/audioProcessing';
import { logService } from '../../utils/appUtils';

export const useLiveAudio = () => {
    const [volume, setVolume] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const inputContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<AudioWorkletNode | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    // Playback timing state
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const initializeAudio = useCallback(async (onAudioData: (data: Float32Array) => void) => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        
        // Output Context (Playback)
        const audioCtx = new AudioContextClass({ sampleRate: 24000 });
        audioContextRef.current = audioCtx;

        // Input Context (Microphone)
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        inputContextRef.current = inputCtx;

        // Microphone Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Apply initial mute state
        stream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });

        if (inputCtx.state === 'suspended') {
            await inputCtx.resume();
        }

        const source = inputCtx.createMediaStreamSource(stream);
        inputSourceRef.current = source;

        // AudioWorklet Setup
        const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        try {
            await inputCtx.audioWorklet.addModule(blobUrl);
        } finally {
            URL.revokeObjectURL(blobUrl);
        }

        const workletNode = new AudioWorkletNode(inputCtx, 'pcm-processor');
        processorRef.current = workletNode;

        // Handle Worklet Messages (Volume + Data)
        workletNode.port.onmessage = (e) => {
            // If muted, we effectively send silence or nothing.
            // However, track.enabled = false usually stops data flow at the source level (OS/Browser).
            // But to be safe and ensure volume is 0 in UI:
            if (isMuted) {
                setVolume(0);
                return;
            }

            const inputData = e.data; // Float32Array
            
            // Calculate Volume
            let sum = 0;
            const sampleCount = inputData.length;
            const step = Math.ceil(sampleCount / 100);
            for (let i = 0; i < sampleCount; i += step) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / (sampleCount / step));
            setVolume(rms);

            // Pass data to callback (for sending to API)
            onAudioData(inputData);
        };

        source.connect(workletNode);
        workletNode.connect(inputCtx.destination); // Keep graph alive

        return { audioCtx, inputCtx };
    }, [isMuted]);

    const toggleMute = useCallback(() => {
        if (streamRef.current) {
            const tracks = streamRef.current.getAudioTracks();
            const newMutedState = !isMuted;
            tracks.forEach(track => {
                track.enabled = !newMutedState;
            });
            setIsMuted(newMutedState);
        } else {
            // Even if stream is not active (yet), toggle state so it applies on next init
            setIsMuted(prev => !prev);
        }
    }, [isMuted]);

    const playAudioChunk = useCallback(async (base64Audio: string) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

        setIsSpeaking(true);

        try {
            // Ensure strict timing sequence
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

            const arrayBuffer = decodeBase64ToArrayBuffer(base64Audio);
            const audioBuffer = await decodeAudioData(arrayBuffer, ctx);
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                    setIsSpeaking(false);
                }
            };

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
        } catch (error) {
            logService.error("Failed to play audio chunk", error);
        }
    }, []);

    const stopAudioPlayback = useCallback(() => {
        sourcesRef.current.forEach(s => {
            try { s.stop(); } catch (e) { /* ignore already stopped */ }
        });
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        setIsSpeaking(false);
    }, []);

    const cleanupAudio = useCallback(() => {
        stopAudioPlayback();

        // Stop Microphone
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        // Disconnect Input Nodes
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (inputSourceRef.current) {
            inputSourceRef.current.disconnect();
            inputSourceRef.current = null;
        }

        // Close Contexts
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        if (inputContextRef.current) {
            inputContextRef.current.close().catch(() => {});
            inputContextRef.current = null;
        }

        setVolume(0);
        setIsMuted(false); // Reset mute state on cleanup
    }, [stopAudioPlayback]);

    return {
        volume,
        isSpeaking,
        isMuted,
        toggleMute,
        initializeAudio,
        playAudioChunk,
        stopAudioPlayback,
        cleanupAudio
    };
};
