import { Type } from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveClientFunctions } from './liveClientFunctions';

describe('createLiveClientFunctions', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:generated-file'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns no live client functions when local Python is disabled', () => {
    const functions = createLiveClientFunctions({
      isLocalPythonEnabled: false,
      selectedFiles: [],
      runPython: vi.fn(),
    });

    expect(functions).toEqual({});
  });

  it('registers a local Python tool and mounts selected files before execution', async () => {
    const selectedFiles = [
      {
        id: 'file-1',
        name: 'dataset.csv',
        rawFile: new File(['a,b\n1,2\n'], 'dataset.csv', { type: 'text/csv' }),
      },
    ] as any;
    const runPython = vi.fn(async () => ({
      output: '42',
      result: '42',
      image: 'base64-image',
      files: [{ name: 'chart.png', type: 'image/png', data: 'Zm9v' }],
    }));

    const functions = createLiveClientFunctions({
      isLocalPythonEnabled: true,
      selectedFiles,
      runPython,
    });

    expect(functions.run_local_python).toBeDefined();
    expect(functions.run_local_python.declaration).toMatchObject({
      name: 'run_local_python',
      parameters: {
        type: Type.OBJECT,
        required: ['code'],
      },
    });
    expect(functions.run_local_python.declaration.parameters?.properties?.code).toMatchObject({
      type: Type.STRING,
    });

    await expect(functions.run_local_python.handler({})).rejects.toThrow(
      'run_local_python requires a non-empty "code" string.',
    );

    await expect(
      functions.run_local_python.handler({
        code: 'print(42)',
      }),
    ).resolves.toEqual({
      response: {
        output: '42',
        result: '42',
        imageGenerated: true,
        generatedFiles: [{ name: 'chart.png', type: 'image/png' }],
      },
      generatedFiles: [
        expect.objectContaining({
          name: 'chart.png',
          type: 'image/png',
          dataUrl: 'blob:generated-file',
          rawFile: expect.any(File),
        }),
      ],
    });

    expect(runPython).toHaveBeenCalledWith('print(42)', { files: selectedFiles });
  });

  it('passes the live tool abort signal through to Python execution', async () => {
    const runPython = vi.fn(async () => ({
      output: '42',
      result: '42',
      files: [],
    }));

    const functions = createLiveClientFunctions({
      isLocalPythonEnabled: true,
      selectedFiles: [],
      runPython,
    });

    const abortController = new AbortController();

    await functions.run_local_python.handler({ code: 'print(42)' }, { abortSignal: abortController.signal });

    expect(runPython).toHaveBeenCalledWith('print(42)', {
      files: [],
      abortSignal: abortController.signal,
    });
  });
});
