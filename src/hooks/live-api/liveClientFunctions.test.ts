import { Type } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { createLiveClientFunctions } from './liveClientFunctions';

describe('createLiveClientFunctions', () => {
  it('returns no live client functions when local Python is disabled', () => {
    const functions = createLiveClientFunctions({
      isLocalPythonEnabled: false,
      selectedFiles: [],
      mountFiles: vi.fn(),
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
    const mountFiles = vi.fn(async () => undefined);
    const runPython = vi.fn(async () => ({
      output: '42',
      result: '42',
      image: 'base64-image',
      files: [{ name: 'chart.png', type: 'image/png', data: 'Zm9v' }],
    }));

    const functions = createLiveClientFunctions({
      isLocalPythonEnabled: true,
      selectedFiles,
      mountFiles,
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
      output: '42',
      result: '42',
      imageGenerated: true,
      generatedFiles: [{ name: 'chart.png', type: 'image/png' }],
    });

    expect(mountFiles).toHaveBeenCalledWith(selectedFiles);
    expect(runPython).toHaveBeenCalledWith('print(42)');
  });
});
