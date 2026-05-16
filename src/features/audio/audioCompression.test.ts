import { describe, expect, it, vi } from 'vitest';
import { compressAudioToMp3 } from './audioCompression';

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

const flushAudioCompressionPipeline = async () => {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
};

const createAudioContextMock = (audioBuffer: { duration: number }) =>
  vi.fn(function AudioContextMock(this: { decodeAudioData: ReturnType<typeof vi.fn> }) {
    this.decodeAudioData = vi.fn().mockResolvedValue(audioBuffer);
  });

const createOfflineAudioContextMock = (pcmData: Float32Array) =>
  vi.fn(function OfflineAudioContextMock(this: {
    createBufferSource: ReturnType<typeof vi.fn>;
    startRendering: ReturnType<typeof vi.fn>;
    destination: Record<string, never>;
  }) {
    this.createBufferSource = vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), buffer: null }));
    this.startRendering = vi.fn().mockResolvedValue({
      getChannelData: () => pcmData,
    });
    this.destination = {};
  });

describe('compressAudioToMp3', () => {
  it('returns tiny source files without spinning up the worker pipeline', async () => {
    const file = new File([new Uint8Array(32)], 'tiny.webm', { type: 'audio/webm' });

    const result = await compressAudioToMp3(file);

    expect(result).toBe(file);
  });

  it('returns an mp3 file when the worker reports success', async () => {
    const worker = new FakeWorker();
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:audio-worker');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const pcmData = new Float32Array([0.25, -0.25, 0.5]);
    vi.stubGlobal('AudioContext', createAudioContextMock({ duration: 2 }));
    vi.stubGlobal('OfflineAudioContext', createOfflineAudioContextMock(pcmData));
    vi.stubGlobal(
      'Worker',
      vi.fn(function WorkerMock() {
        return worker;
      }),
    );
    const sourceFile = new File([new Uint8Array(60 * 1024)], 'voice.wav', { type: 'audio/wav' });

    const promise = compressAudioToMp3(sourceFile);

    await flushAudioCompressionPipeline();

    expect(worker.postMessage).toHaveBeenCalledWith({ pcmData, sampleRate: 16_000, kbps: 64 }, [pcmData.buffer]);
    expect(createObjectUrl).toHaveBeenCalled();
    const workerCode = await (createObjectUrl.mock.calls[0][0] as Blob).text();
    expect(workerCode).toContain("importScripts('/lame.min.js')");
    expect(workerCode).toContain("self.postMessage({ type: 'success'");

    worker.emitSuccess([new Uint8Array([7, 8, 9])]);

    const result = await promise;

    expect(result.name).toBe('voice.mp3');
    expect(result.type).toBe('audio/mpeg');
    expect(worker.terminate).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:audio-worker');

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to the original audio when the worker reports an encoding error', async () => {
    const worker = new FakeWorker();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:audio-worker');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.stubGlobal('AudioContext', createAudioContextMock({ duration: 2 }));
    vi.stubGlobal('OfflineAudioContext', createOfflineAudioContextMock(new Float32Array([0.1])));
    vi.stubGlobal(
      'Worker',
      vi.fn(function WorkerMock() {
        return worker;
      }),
    );
    const sourceFile = new File([new Uint8Array(60 * 1024)], 'voice.wav', { type: 'audio/wav' });

    const promise = compressAudioToMp3(sourceFile);

    await flushAudioCompressionPipeline();

    worker.emitFailure();

    const result = await promise;

    expect(result.name).toBe('voice.wav');
    expect(result.type).toBe('audio/wav');

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects with AbortError and tears down the worker when aborted', async () => {
    const worker = new FakeWorker();
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:audio-worker');
    vi.stubGlobal('AudioContext', createAudioContextMock({ duration: 2 }));
    vi.stubGlobal('OfflineAudioContext', createOfflineAudioContextMock(new Float32Array([0.1, 0.2])));
    vi.stubGlobal(
      'Worker',
      vi.fn(function WorkerMock() {
        return worker;
      }),
    );
    const abortController = new AbortController();
    const file = new File([new Uint8Array(60 * 1024)], 'voice.wav', { type: 'audio/wav' });

    const promise = compressAudioToMp3(file, abortController.signal);

    await flushAudioCompressionPipeline();
    abortController.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminate).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:audio-worker');

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
