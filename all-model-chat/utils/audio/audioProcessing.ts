
/**
 * Decodes a Base64 string into a Uint8Array.
 */
export const decodeBase64ToArrayBuffer = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

/**
 * Decodes a raw PCM byte array into an AudioBuffer using the provided AudioContext.
 */
export const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
};

/**
 * Encodes Float32 audio data (from AudioWorklet) into a PCM16 Base64 string.
 */
export const float32ToPCM16Base64 = (data: Float32Array): string => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
    }
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

/**
 * Combines multiple Base64 PCM16 chunks into a single WAV Blob URL.
 */
export const createWavBlobFromPCMChunks = (chunks: string[], sampleRate = 24000): string | null => {
    if (chunks.length === 0) return null;

    // 1. Calculate total length
    let totalLen = 0;
    const decodedChunks: Uint8Array[] = [];
    
    for (const chunk of chunks) {
        const decoded = decodeBase64ToArrayBuffer(chunk);
        decodedChunks.push(decoded);
        totalLen += decoded.length;
    }

    // 2. Merge chunks
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of decodedChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    // 3. Create WAV Header
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const wav = new ArrayBuffer(44 + totalLen);
    const dv = new DataView(wav);

    let p = 0;
    const writeStr = (s: string) => [...s].forEach(ch => dv.setUint8(p++, ch.charCodeAt(0)));

    writeStr('RIFF');
    dv.setUint32(p, 36 + totalLen, true); p += 4;
    writeStr('WAVEfmt ');
    dv.setUint32(p, 16, true); p += 4;        // fmt length
    dv.setUint16(p, 1, true);  p += 2;        // PCM
    dv.setUint16(p, numChannels, true); p += 2;
    dv.setUint32(p, sampleRate, true); p += 4;
    dv.setUint32(p, sampleRate * blockAlign, true); p += 4;
    dv.setUint16(p, blockAlign, true); p += 2;
    dv.setUint16(p, bytesPerSample * 8, true); p += 2;
    writeStr('data');
    dv.setUint32(p, totalLen, true); p += 4;

    new Uint8Array(wav, 44).set(merged);

    // 4. Create Blob and URL
    const blob = new Blob([wav], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

/**
 * Mixes microphone audio with system audio (if enabled/available).
 * Returns the mixed MediaStream and a cleanup function.
 */
export const getMixedAudioStream = async (micStream: MediaStream, includeSystemAudio: boolean): Promise<{ stream: MediaStream, cleanup: () => void }> => {
    // If system audio is not requested, return the mic stream directly.
    // This preserves the raw constraints (no echo cancellation, etc.) applied during getUserMedia,
    // as passing it through Web Audio API nodes might inadvertently alter these characteristics or introduce latency.
    if (!includeSystemAudio) {
        return { 
            stream: micStream, 
            cleanup: () => {
                // No extra cleanup needed for single stream beyond caller stopping tracks
            } 
        };
    }

    try {
        // Request System Audio (Display Media)
        // Added 'displaySurface: monitor' to default to entire screen
        // Added 'systemAudio: include' to hint ensuring audio checkbox is checked
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: 1, 
                height: 1, // Request minimal video to reduce overhead
                displaySurface: 'monitor', // Hint to browser: Default to "Entire Screen" tab
            } as any,
            audio: true,
            // @ts-ignore
            systemAudio: 'include', // Hint to browser: Default check "Share system audio"
            // @ts-ignore
            selfBrowserSurface: 'exclude' // Prefer not capturing the chat app itself if possible
        } as any);

        // Check if user shared audio
        const systemAudioTrack = displayStream.getAudioTracks()[0];
        if (!systemAudioTrack) {
            // User likely didn't check "Share tab audio"
            displayStream.getTracks().forEach(t => t.stop());
            console.warn("System audio requested but not provided by user.");
            // Fallback to mic only
            return { stream: micStream, cleanup: () => {} };
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const dest = ctx.createMediaStreamDestination();

        // Mic Source
        const micSource = ctx.createMediaStreamSource(micStream);
        
        // System Source
        const sysSource = ctx.createMediaStreamSource(displayStream);

        // Mix
        // Optional: Gain nodes to balance volume if needed
        micSource.connect(dest);
        sysSource.connect(dest);

        const mixedStream = dest.stream;

        // Cleanup function
        const cleanup = () => {
            displayStream.getTracks().forEach(t => t.stop());
            micSource.disconnect();
            sysSource.disconnect();
            ctx.close();
        };

        // Listen for track ending on the display stream (user clicked "Stop Sharing")
        systemAudioTrack.onended = () => {
            // We could handle this gracefully, but usually this just cuts the system audio.
            // The mix will continue with just mic.
        };

        return { stream: mixedStream, cleanup };

    } catch (error) {
        console.error("Failed to capture system audio:", error);
        // Fallback to mic only if system capture fails/cancelled
        return { stream: micStream, cleanup: () => {} };
    }
};
