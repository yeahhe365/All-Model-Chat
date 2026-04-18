import { describe, expect, it, vi } from 'vitest';
import {
  compressAudioToMp3,
  createAudioCompressionWorkerCode,
  encodeMp3WithWorker,
} from './audioCompression';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  emitSuccess(buffers: Uint8Array[]) {
    this.onmessage?.({ data: { type: 'success', buffers } } as MessageEvent);
  }

  emitFailure(message = 'worker failed') {
    this.onmessage?.({ data: { type: 'error', error: message } } as MessageEvent);
  }

  emitUnhandledError() {
    this.onerror?.(new Event('error'));
  }
}

describe('createAudioCompressionWorkerCode', () => {
  it('keeps the embedded lamejs worker bootstrap in the generated code', () => {
    const workerCode = createAudioCompressionWorkerCode();

    expect(workerCode).toContain("importScripts('/lame.min.js')");
    expect(workerCode).toContain("self.postMessage({ type: 'success'");
  });
});

describe('compressAudioToMp3', () => {
  it('returns tiny source files without spinning up the worker pipeline', async () => {
    const file = new File([new Uint8Array(32)], 'tiny.webm', { type: 'audio/webm' });

    const result = await compressAudioToMp3(file);

    expect(result).toBe(file);
  });
});

describe('encodeMp3WithWorker', () => {
  it('returns an mp3 file when the worker reports success', async () => {
    const worker = new FakeWorker();
    const createObjectUrl = vi.fn(() => 'blob:audio-worker');
    const revokeObjectUrl = vi.fn();
    const pcmData = new Float32Array([0.25, -0.25, 0.5]);
    const sourceFile = new File([new Uint8Array([1, 2, 3])], 'voice.wav', { type: 'audio/wav' });

    const promise = encodeMp3WithWorker({
      pcmData,
      sampleRate: 16_000,
      kbps: 64,
      file: sourceFile,
      createWorker: vi.fn(() => worker as unknown as Worker),
      createObjectUrl,
      revokeObjectUrl,
    });

    expect(worker.postMessage).toHaveBeenCalledWith(
      { pcmData, sampleRate: 16_000, kbps: 64 },
      [pcmData.buffer],
    );

    worker.emitSuccess([new Uint8Array([7, 8, 9])]);

    const result = await promise;

    expect(result.name).toBe('voice.mp3');
    expect(result.type).toBe('audio/mpeg');
    expect(worker.terminate).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:audio-worker');
  });

  it('falls back to the original audio when the worker reports an encoding error', async () => {
    const worker = new FakeWorker();
    const sourceFile = new File([new Uint8Array([4, 5, 6])], 'voice.wav', { type: 'audio/wav' });

    const promise = encodeMp3WithWorker({
      pcmData: new Float32Array([0.1]),
      sampleRate: 16_000,
      kbps: 64,
      file: sourceFile,
      createWorker: vi.fn(() => worker as unknown as Worker),
      createObjectUrl: vi.fn(() => 'blob:audio-worker'),
      revokeObjectUrl: vi.fn(),
    });

    worker.emitFailure();

    const result = await promise;

    expect(result.name).toBe('voice.wav');
    expect(result.type).toBe('audio/wav');
  });

  it('rejects with AbortError and tears down the worker when aborted', async () => {
    const worker = new FakeWorker();
    const revokeObjectUrl = vi.fn();
    const abortController = new AbortController();

    const promise = encodeMp3WithWorker({
      pcmData: new Float32Array([0.1, 0.2]),
      sampleRate: 16_000,
      kbps: 64,
      file: new File([new Uint8Array([1, 2])], 'voice.wav', { type: 'audio/wav' }),
      signal: abortController.signal,
      createWorker: vi.fn(() => worker as unknown as Worker),
      createObjectUrl: vi.fn(() => 'blob:audio-worker'),
      revokeObjectUrl,
    });

    abortController.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminate).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:audio-worker');
  });
});
