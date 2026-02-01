
import { decodeBase64ToArrayBuffer } from '../fileHelpers';

export { decodeBase64ToArrayBuffer };

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
 * Helper to write WAV header and data to an ArrayBuffer
 */
const createWavBuffer = (pcmData: Uint8Array, sampleRate: number, numChannels: number): ArrayBuffer => {
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const wav = new ArrayBuffer(44 + pcmData.length);
    const dv = new DataView(wav);

    let p = 0;
    const writeStr = (s: string) => [...s].forEach(ch => dv.setUint8(p++, ch.charCodeAt(0)));

    writeStr('RIFF');
    dv.setUint32(p, 36 + pcmData.length, true); p += 4;
    writeStr('WAVEfmt ');
    dv.setUint32(p, 16, true); p += 4;        // fmt length
    dv.setUint16(p, 1, true);  p += 2;        // PCM
    dv.setUint16(p, numChannels, true); p += 2;
    dv.setUint32(p, sampleRate, true); p += 4;
    dv.setUint32(p, sampleRate * blockAlign, true); p += 4;
    dv.setUint16(p, blockAlign, true); p += 2;
    dv.setUint16(p, bytesPerSample * 8, true); p += 2;
    writeStr('data');
    dv.setUint32(p, pcmData.length, true); p += 4;

    new Uint8Array(wav, 44).set(pcmData);
    return wav;
};

/**
 * Converts a base64 encoded PCM16 string to a WAV Blob URL.
 */
export function pcmBase64ToWavUrl(
  base64: string,
  sampleRate = 24_000,
  numChannels = 1,
): string {
  const pcm = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const wavBuffer = createWavBuffer(pcm, sampleRate, numChannels);
  return URL.createObjectURL(new Blob([wavBuffer], { type: 'audio/wav' }));
}

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

    // 3. Create WAV Buffer using shared helper
    const wavBuffer = createWavBuffer(merged, sampleRate, 1);

    // 4. Create Blob and URL
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

/**
 * Combines microphone stream with system audio stream (screen share) if requested.
 * Returns the resulting mixed stream and a cleanup function.
 */
export const getMixedAudioStream = async (micStream: MediaStream, includeSystemAudio: boolean = false): Promise<{ stream: MediaStream; cleanup: () => void }> => {
    if (!includeSystemAudio) {
        return { stream: micStream, cleanup: () => {} };
    }

    try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: 1,
                height: 1, // Request minimal video size as we only need audio
            },
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
            },
            // @ts-ignore
            systemAudio: 'include',
            // @ts-ignore
            selfBrowserSurface: 'include'
        } as any);

        // Check if audio track exists (user might have unchecked "Share Audio")
        if (displayStream.getAudioTracks().length === 0) {
            console.warn("System audio not shared (user might have unchecked 'Share Audio').");
            displayStream.getTracks().forEach(t => t.stop());
            return { stream: micStream, cleanup: () => {} };
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const dest = ctx.createMediaStreamDestination();

        const micSource = ctx.createMediaStreamSource(micStream);
        const sysSource = ctx.createMediaStreamSource(displayStream);

        micSource.connect(dest);
        sysSource.connect(dest);

        const cleanup = () => {
            try {
                micSource.disconnect();
                sysSource.disconnect();
                displayStream.getTracks().forEach(t => t.stop());
                ctx.close().catch(() => {});
            } catch (e) {
                console.error("Error cleaning up mixed stream:", e);
            }
        };

        return { stream: dest.stream, cleanup };

    } catch (error) {
        console.warn("System audio capture cancelled or failed:", error);
        // Fallback to mic only
        return { stream: micStream, cleanup: () => {} };
    }
};
