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
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  emit(data: Record<string, unknown>) {
    this.onmessage?.({ data } as MessageEvent);
  }

  emitError(message = 'worker crashed') {
    this.onerror?.({ message } as ErrorEvent);
  }

  emitMessageError(data: Record<string, unknown> = {}) {
    this.onmessageerror?.({ data } as MessageEvent);
  }
}

const createService = (overrides: Partial<ConstructorParameters<typeof PyodideService>[0]> = {}) => {
  const workers = [new FakeWorker(), new FakeWorker(), new FakeWorker()];
  const createObjectUrl = vi.fn(() => 'blob:pyodide-worker');
  const revokeObjectUrl = vi.fn();
  const createWorker = vi.fn(() => (workers.shift() ?? new FakeWorker()) as unknown as Worker);
  const ids = ['mount-1', 'run-1', 'run-2', 'run-3', 'run-4'];

  const service = new PyodideService({
    baseUri: 'https://example.com/app/index.html',
    createWorker,
    createObjectUrl,
    revokeObjectUrl,
    createRequestId: () => ids.shift() ?? `req-${Date.now()}`,
    ...overrides,
  });

  return { service, workers, createWorker, createObjectUrl, revokeObjectUrl };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const waitForWorkerPost = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('buildPyodideWorkerScript', () => {
  it('injects the resolved pyodide base URL into the worker code', () => {
    const { pyodideBaseUrl, workerCode } = buildPyodideWorkerScript(
      'https://example.com/nested/app/index.html',
    );

    expect(pyodideBaseUrl).toBe('https://example.com/nested/app/pyodide/');
    expect(workerCode).toContain('https://example.com/nested/app/pyodide/');
    expect(workerCode).not.toContain('__PYODIDE_BASE_URL__');
    expect(workerCode).toContain('const runDir =');
    expect(workerCode).toContain('pyodide.FS.chdir(runDir)');
    expect(workerCode).toContain('removePath(runDir)');
  });
});

describe('PyodideService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts raw file buffers through the worker and resolves on mount completion', async () => {
    const { service, workers, createObjectUrl, revokeObjectUrl } = createService();
    const [worker] = workers;
    const csvFile = new File(['a,b\n1,2\n'], 'dataset.csv', { type: 'text/csv' });

    const mountPromise = service.mountFiles([
      {
        id: 'file-1',
        name: 'dataset.csv',
        rawFile: csvFile,
      } as any,
    ]);

    await waitForWorkerPost();

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
    const { service, workers } = createService();
    const [worker] = workers;

    const runPromise = service.runPython('print("hello")');

    await waitForWorkerPost();

    expect(worker.postMessage).toHaveBeenCalledWith(
      {
        id: 'mount-1',
        type: 'RUN_PYTHON',
        code: 'print("hello")',
        files: [],
      },
      [],
    );

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
      status: 'success',
      output: 'hello',
      image: 'base64-image',
      files: [{ name: 'chart.png', data: 'Zm9v', type: 'image/png' }],
      result: 'None',
    });
  });

  it('sends execution-scoped files with each python request', async () => {
    const { service, workers } = createService();
    const [worker] = workers;
    const csvFile = new File(['a,b\n1,2\n'], 'dataset.csv', { type: 'text/csv' });

    const runPromise = service.runPython('print("hello")', {
      files: [
        {
          id: 'file-1',
          name: 'dataset.csv',
          rawFile: csvFile,
        } as any,
      ],
    });

    await waitForWorkerPost();

    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    const [message, transferredBuffers] = worker.postMessage.mock.calls[0];

    expect(message).toMatchObject({
      id: 'mount-1',
      type: 'RUN_PYTHON',
      code: 'print("hello")',
    });
    expect(message.files).toHaveLength(1);
    expect(message.files[0].name).toBe('dataset.csv');
    expect(message.files[0].data).toBeInstanceOf(ArrayBuffer);
    expect(transferredBuffers).toHaveLength(1);

    worker.emit({
      id: 'mount-1',
      status: 'success',
      output: 'hello',
    });

    await expect(runPromise).resolves.toEqual({
      status: 'success',
      output: 'hello',
      image: undefined,
      files: undefined,
      result: undefined,
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

  it('recreates the worker after a timed out execution so the next request can recover', async () => {
    vi.useFakeTimers();

    const { service, workers, createWorker } = createService();
    const [firstWorker, secondWorker] = workers;

    const timedOutRun = service.runPython('print("slow")');
    const timedOutRejection = expect(timedOutRun).rejects.toThrow('Execution timed out (60s)');
    await vi.advanceTimersByTimeAsync(60_000);
    await timedOutRejection;

    expect(firstWorker.terminate).toHaveBeenCalledTimes(1);

    const recoveredRun = service.runPython('print("recovered")');
    await flushMicrotasks();

    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(secondWorker.postMessage).toHaveBeenCalledWith(
      {
        id: 'run-1',
        type: 'RUN_PYTHON',
        code: 'print("recovered")',
        files: [],
      },
      [],
    );

    secondWorker.emit({
      id: 'run-1',
      status: 'success',
      output: 'recovered',
    });

    await expect(recoveredRun).resolves.toEqual({
      status: 'success',
      output: 'recovered',
      image: undefined,
      files: undefined,
      result: undefined,
    });
  });

  it('resets the worker after a fatal worker error and rejects the in-flight request', async () => {
    const { service, workers, createWorker } = createService();
    const [firstWorker, secondWorker] = workers;

    const crashedRun = service.runPython('print("boom")');
    await flushMicrotasks();
    firstWorker.emitError('worker crashed');

    await expect(crashedRun).rejects.toThrow('worker crashed');
    expect(firstWorker.terminate).toHaveBeenCalledTimes(1);

    const recoveredRun = service.runPython('print("after crash")');
    await flushMicrotasks();
    expect(createWorker).toHaveBeenCalledTimes(2);

    secondWorker.emit({
      id: 'run-1',
      status: 'success',
      output: 'after crash',
    });

    await expect(recoveredRun).resolves.toEqual({
      status: 'success',
      output: 'after crash',
      image: undefined,
      files: undefined,
      result: undefined,
    });
  });

  it('rejects overlapping executions while a request is already running', async () => {
    const { service, workers } = createService();
    const [worker] = workers;

    const firstRun = service.runPython('print("first")');
    const secondRun = service.runPython('print("second")');

    await expect(secondRun).rejects.toThrow('Pyodide request already in progress');
    expect(worker.postMessage).toHaveBeenCalledTimes(1);

    worker.emit({
      id: 'mount-1',
      status: 'success',
      output: 'first',
    });

    await expect(firstRun).resolves.toEqual({
      status: 'success',
      output: 'first',
      image: undefined,
      files: undefined,
      result: undefined,
    });
  });

  it('binds the default timeout implementation so browser native timers do not throw illegal invocation', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    const strictSetTimeout = function (
      this: typeof globalThis,
      handler: Parameters<typeof setTimeout>[0],
      timeout?: number,
    ) {
      if (this !== globalThis) {
        throw new TypeError('Illegal invocation');
      }
      return originalSetTimeout(handler, timeout);
    } as typeof setTimeout;

    vi.stubGlobal('setTimeout', strictSetTimeout);

    try {
      const { service, workers } = createService({ setTimeoutFn: undefined });
      const [worker] = workers;
      const runPromise = service.runPython('print("bound")');

      await flushMicrotasks();

      worker.emit({
        id: 'mount-1',
        status: 'success',
        output: 'bound',
      });

      await expect(runPromise).resolves.toEqual({
        status: 'success',
        output: 'bound',
        image: undefined,
        files: undefined,
        result: undefined,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
