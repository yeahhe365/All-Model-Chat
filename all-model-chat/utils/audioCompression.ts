
// Web Worker code embedded as string to avoid extra file management
const WORKER_CODE = `
importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');

self.onmessage = function(e) {
    try {
        const { pcmData, sampleRate, kbps } = e.data;
        
        // 1. Convert Float32 to Int16
        // Doing this in worker prevents main thread freeze
        // Float32 is -1.0 to 1.0, Int16 is -32768 to 32767
        const samples = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            const s = Math.max(-1, Math.min(1, pcmData[i]));
            samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // 2. Encode
        // @ts-ignore
        if (typeof lamejs === 'undefined') {
            throw new Error('lamejs not loaded in worker');
        }

        const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
        const mp3Data = [];
        const sampleBlockSize = 1152; // Must be multiple of 576

        for (let i = 0; i < samples.length; i += sampleBlockSize) {
            const chunk = samples.subarray(i, i + sampleBlockSize);
            const mp3buf = mp3encoder.encodeBuffer(chunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }

        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        self.postMessage({ type: 'success', buffers: mp3Data });
    } catch (err) {
        self.postMessage({ type: 'error', error: err.message });
    }
};
`;

export const compressAudioToMp3 = async (file: File | Blob, signal?: AbortSignal): Promise<File> => {
    const checkAbort = () => {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    };

    try {
        checkAbort();

        // 1. Prepare Audio Context
        const arrayBuffer = await file.arrayBuffer();
        checkAbort();

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Decode data
        // Note: decodeAudioData detaches the arrayBuffer in some implementations.
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        checkAbort();

        // Optimization: Skip compression if already MP3 and bitrate is efficient (<= ~80kbps)
        // Target is 64kbps, we give a little buffer for VBR peaks.
        const duration = audioBuffer.duration;
        const fileSize = file.size;
        const bitrate = duration > 0 ? (fileSize * 8) / duration : 0; // bits per second
        
        const isMp3 = file.type === 'audio/mpeg' || 
                      file.type === 'audio/mp3' || 
                      ('name' in file && (file as File).name.toLowerCase().endsWith('.mp3'));

        if (isMp3 && bitrate > 0 && bitrate < 80000) {
            // Already efficient, return original
            if (file instanceof File) {
                return file;
            }
            return new File([file], `audio-${Date.now()}.mp3`, { type: 'audio/mpeg' });
        }

        // 2. Resample and Mix to Mono (16kHz, 1 Channel)
        const targetSampleRate = 16000;
        const targetChannels = 1;
        
        // Calculate duration and frame count
        const frameCount = Math.ceil(audioBuffer.duration * targetSampleRate);
        
        const offlineCtx = new OfflineAudioContext(
            targetChannels, 
            frameCount, 
            targetSampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();

        const renderedBuffer = await offlineCtx.startRendering();
        checkAbort();
        const pcmData = renderedBuffer.getChannelData(0); // Float32Array

        // 3. Offload Encoding to Web Worker
        return new Promise((resolve, reject) => {
            const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl);

            const cleanup = () => {
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
            };

            if (signal) {
                if (signal.aborted) {
                    cleanup();
                    return reject(new DOMException('Aborted', 'AbortError'));
                }
                signal.addEventListener('abort', () => {
                    cleanup();
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            }

            worker.onmessage = (e) => {
                if (e.data.type === 'success') {
                    const mp3Blob = new Blob(e.data.buffers, { type: 'audio/mpeg' });
                    
                    // Generate filename
                    const originalName = (file as File).name || `audio-${Date.now()}`;
                    const newName = originalName.replace(/\.[^/.]+$/, "") + ".mp3";
                    
                    cleanup();
                    resolve(new File([mp3Blob], newName, { type: 'audio/mpeg' }));
                } else {
                    console.error("Worker encoding failed:", e.data.error);
                    fallbackToOriginal();
                }
            };

            worker.onerror = (e) => {
                console.error("Worker error:", e);
                fallbackToOriginal();
            };

            const fallbackToOriginal = () => {
                cleanup();
                const originalName = (file as File).name || `recording-${Date.now()}.wav`;
                resolve(new File([file], originalName, { type: file.type || "audio/wav" }));
            };

            // Transfer the PCM data buffer to the worker to avoid copying overhead
            worker.postMessage({ 
                pcmData: pcmData, 
                sampleRate: targetSampleRate, 
                kbps: 64 
            }, [pcmData.buffer]);
        });

    } catch (error) {
        if ((error instanceof DOMException && error.name === 'AbortError') || (error instanceof Error && error.name === 'AbortError')) {
            throw error;
        }
        console.error("Audio compression setup failed:", error);
        const originalName = (file as File).name || `recording-${Date.now()}.wav`;
        return new File([file], originalName, { type: file.type || "audio/wav" });
    }
};