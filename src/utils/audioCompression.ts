import { createManagedObjectUrl, releaseManagedObjectUrl } from '../services/objectUrlManager';

// Web Worker code embedded as string to avoid extra file management
const WORKER_CODE = `
importScripts('/lame.min.js');

self.onmessage = function(e) {
    try {
        const { pcmData, sampleRate, kbps } = e.data;
        
        // 1. Convert Float32 to Int16
        const samples = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            const s = Math.max(-1, Math.min(1, pcmData[i]));
            samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // 2. Encode
        if (typeof lamejs === 'undefined') {
            throw new Error('lamejs not loaded in worker');
        }

        const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
        const mp3Data = [];
        const sampleBlockSize = 1152; 

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

interface EncodeMp3WithWorkerOptions {
  pcmData: Float32Array;
  sampleRate: number;
  kbps: number;
  file: File | Blob;
  signal?: AbortSignal;
  createWorker?: (url: string) => Worker;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
}

export const createAudioCompressionWorkerCode = () => WORKER_CODE;

export const encodeMp3WithWorker = async ({
  pcmData,
  sampleRate,
  kbps,
  file,
  signal,
  createWorker,
  createObjectUrl,
  revokeObjectUrl,
}: EncodeMp3WithWorkerOptions): Promise<File> => {
  return new Promise((resolve, reject) => {
    const workerBlob = new Blob([createAudioCompressionWorkerCode()], { type: 'application/javascript' });
    const workerUrl = (createObjectUrl ?? createManagedObjectUrl)(workerBlob);
    const worker = (createWorker ?? ((url: string) => new Worker(url)))(workerUrl);

    const cleanup = () => {
      worker.terminate();
      (revokeObjectUrl ?? releaseManagedObjectUrl)(workerUrl);
    };

    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    }

    worker.onmessage = (e) => {
      if (e.data.type === 'success') {
        const mp3Blob = new Blob(e.data.buffers, { type: 'audio/mpeg' });
        const originalName = (file as File).name || `audio-${Date.now()}`;
        const newName = originalName.replace(/\.[^/.]+$/, '') + '.mp3';
        cleanup();
        resolve(new File([mp3Blob], newName, { type: 'audio/mpeg' }));
      } else {
        cleanup();
        const originalName = (file as File).name || `recording-${Date.now()}.wav`;
        resolve(new File([file], originalName, { type: file.type || 'audio/wav' }));
      }
    };

    worker.onerror = () => {
      cleanup();
      const originalName = (file as File).name || `recording-${Date.now()}.wav`;
      resolve(new File([file], originalName, { type: file.type || 'audio/wav' }));
    };

    worker.postMessage({ pcmData, sampleRate, kbps }, [pcmData.buffer]);
  });
};

export const compressAudioToMp3 = async (file: File | Blob, signal?: AbortSignal): Promise<File> => {
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  };

  // 优化：如果文件极其微小 (小于 50KB)，很有可能是极短的语音，直接返回原始文件
  if (file.size < 50 * 1024) {
    if (file instanceof File) return file;
    return new File([file], `recording-${Date.now()}.webm`, { type: file.type || 'audio/webm' });
  }

  try {
    checkAbort();

    const arrayBuffer = await file.arrayBuffer();
    checkAbort();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    checkAbort();

    // 优化：如果时长小于 1.5 秒，没必要压缩
    if (audioBuffer.duration < 1.5) {
      if (file instanceof File) return file;
      return new File([file], `recording-${Date.now()}.webm`, { type: file.type || 'audio/webm' });
    }

    const duration = audioBuffer.duration;
    const fileSize = file.size;
    const bitrate = duration > 0 ? (fileSize * 8) / duration : 0;

    const isMp3 =
      file.type === 'audio/mpeg' ||
      file.type === 'audio/mp3' ||
      ('name' in file && (file as File).name.toLowerCase().endsWith('.mp3'));

    if (isMp3 && bitrate > 0 && bitrate < 80000) {
      if (file instanceof File) return file;
      return new File([file], `audio-${Date.now()}.mp3`, { type: 'audio/mpeg' });
    }

    const targetSampleRate = 16000;
    const targetChannels = 1;
    const frameCount = Math.ceil(audioBuffer.duration * targetSampleRate);

    const offlineCtx = new OfflineAudioContext(targetChannels, frameCount, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const renderedBuffer = await offlineCtx.startRendering();
    checkAbort();
    const pcmData = renderedBuffer.getChannelData(0);

    return encodeMp3WithWorker({
      pcmData,
      sampleRate: targetSampleRate,
      kbps: 64,
      file,
      signal,
    });
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      throw error;
    }
    const originalName = (file as File).name || `recording-${Date.now()}.wav`;
    return new File([file], originalName, { type: file.type || 'audio/wav' });
  }
};
