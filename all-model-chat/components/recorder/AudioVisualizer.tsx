
import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
    stream: MediaStream | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!stream || !canvasRef.current) return;

        const initAudio = () => {
            const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextConstructor();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.6;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            source.connect(analyser);

            drawVisualizer();
        };

        const drawVisualizer = () => {
            if (!analyserRef.current || !canvasRef.current) return;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const draw = () => {
                if (!analyserRef.current) return;

                animationFrameIdRef.current = requestAnimationFrame(draw);
                analyserRef.current.getByteFrequencyData(dataArray);

                const width = canvas.width;
                const height = canvas.height;

                ctx.clearRect(0, 0, width, height);

                const style = getComputedStyle(document.body);
                const accentColor = style.getPropertyValue('--theme-bg-accent').trim() || '#3b82f6';
                ctx.fillStyle = accentColor;

                const effectiveSlice = Math.floor(bufferLength * 0.7);
                const barWidth = (width / bufferLength) * 2.5;
                let x = (width - (effectiveSlice * (barWidth + 1))) / 2;

                for (let i = 0; i < effectiveSlice; i++) {
                    const barHeight = (dataArray[i] / 255) * height * 0.9;
                    if (barHeight > 2) {
                        ctx.beginPath();
                        ctx.roundRect(x, (height - barHeight) / 2, barWidth, barHeight, 2);
                        ctx.fill();
                    }
                    x += barWidth + 1;
                }
            };
            draw();
        };

        // Slight delay to ensure canvas is mounted and dimensions are correct
        const timeoutId = setTimeout(initAudio, 50);

        return () => {
            clearTimeout(timeoutId);
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            sourceRef.current?.disconnect();
            analyserRef.current?.disconnect();
            audioContextRef.current?.close().catch(() => {});
        };
    }, [stream]);

    return (
        <div className="w-full h-16 flex items-center justify-center bg-[var(--theme-bg-tertiary)]/20 rounded-xl overflow-hidden">
            <canvas
                ref={canvasRef}
                width={300}
                height={64}
                className="w-full h-full object-contain"
            />
        </div>
    );
};
