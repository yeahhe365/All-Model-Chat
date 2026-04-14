import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/appUtils', () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  buildPyodideWorkerScript,
  PyodideService,
  type ExecutionResult,
} from './pyodideService';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  emit(data: Record<string, unknown>) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

const createService = (overrides: Partial<ConstructorParameters<typeof PyodideService>[0]> = {}) => {
  const worker = new FakeWorker();
  const createObjectUrl = vi.fn(() => 'blob:pyodide-worker');
  const revokeObjectUrl = vi.fn();
  const ids = ['mount-1', 'run-1', 'run-2'];

  const service = new PyodideService({
    baseUri: 'https://example.com/app/index.html',
    createWorker: vi.fn(() => worker as unknown as Worker),
    createObjectUrl,
    revokeObjectUrl,
    createRequestId: () => ids.shift() ?? `req-${Date.now()}`,
    ...overrides,
  });

  return { service, worker, createObjectUrl, revokeObjectUrl };
};

describe('buildPyodideWorkerScript', () => {
  it('injects the resolved pyodide base URL into the worker code', () => {
    const { pyodideBaseUrl, workerCode } = buildPyodideWorkerScript(
      'https://example.com/nested/app/index.html',
    );

    expect(pyodideBaseUrl).toBe('https://example.com/nested/app/pyodide/');
    expect(workerCode).toContain('https://example.com/nested/app/pyodide/');
    expect(workerCode).not.toContain('__PYODIDE_BASE_URL__');
  });
});

describe('PyodideService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts raw file buffers through the worker and resolves on mount completion', async () => {
    const { service, worker, createObjectUrl, revokeObjectUrl } = createService();
    const csvFile = new File(['a,b\n1,2\n'], 'dataset.csv', { type: 'text/csv' });

    const mountPromise = service.mountFiles([
      {
        id: 'file-1',
        name: 'dataset.csv',
        rawFile: csvFile,
      } as any,
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:pyodide-worker');
    expect(worker.postMessage).toHaveBeenCalledTimes(1);

    const [message, transferredBuffers] = worker.postMessage.mock.calls[0];
    expect(message.type).toBe('MOUNT_FILES');
    expect(message.id).toBe('mount-1');
    expect(message.files).toHaveLength(1);
    expect(message.files[0].name).toBe('dataset.csv');
    expect(message.files[0].data).toBeInstanceOf(ArrayBuffer);
    expect(transferredBuffers).toHaveLength(1);
    expect(transferredBuffers[0]).toBe(message.files[0].data);

    worker.emit({ id: 'mount-1', status: 'success', type: 'MOUNT_COMPLETE' });

    await expect(mountPromise).resolves.toBeUndefined();
  });

  it('resolves execution payloads posted back from the worker', async () => {
    const { service, worker } = createService();

    const runPromise = service.runPython('print("hello")');

    expect(worker.postMessage).toHaveBeenCalledWith({
      id: 'mount-1',
      code: 'print("hello")',
    });

    const payload: Omit<ExecutionResult, 'status'> & { id: string; status: 'success' } = {
      id: 'mount-1',
      status: 'success',
      output: 'hello',
      image: 'base64-image',
      files: [{ name: 'chart.png', data: 'Zm9v', type: 'image/png' }],
      result: 'None',
    };

    worker.emit(payload);

    await expect(runPromise).resolves.toEqual({
      output: 'hello',
      image: 'base64-image',
      files: [{ name: 'chart.png', data: 'Zm9v', type: 'image/png' }],
      result: 'None',
    });
  });

  it('rejects python execution after the safety timeout', async () => {
    vi.useFakeTimers();

    const { service } = createService();
    const runPromise = service.runPython('print("slow")');
    const rejection = expect(runPromise).rejects.toThrow('Execution timed out (60s)');

    await vi.advanceTimersByTimeAsync(60_000);

    await rejection;
  });
});
