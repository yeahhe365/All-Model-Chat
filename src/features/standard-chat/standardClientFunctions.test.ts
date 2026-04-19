import { Type } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { createStandardClientFunctions } from './standardClientFunctions';

describe('createStandardClientFunctions', () => {
  it('returns no standard chat client functions when local Python is disabled', () => {
    const functions = createStandardClientFunctions({
      isLocalPythonEnabled: false,
      inputFiles: [],
      runPython: vi.fn(),
    });

    expect(functions).toEqual({});
  });

  it('registers a local Python tool with structured response payload and generated files', async () => {
    const inputFiles = [
      {
        id: 'file-1',
        name: 'dataset.csv',
        rawFile: new File(['a,b\n1,2\n'], 'dataset.csv', { type: 'text/csv' }),
        uploadState: 'active',
      },
    ] as any;
    const runPython = vi.fn(async () => ({
      output: '42',
      result: '42',
      image: 'Zm9v',
      files: [],
    }));

    const functions = createStandardClientFunctions({
      isLocalPythonEnabled: true,
      inputFiles,
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

    await expect(functions.run_local_python.handler({})).rejects.toThrow(
      'run_local_python requires a non-empty "code" string.',
    );

    await expect(
      functions.run_local_python.handler({
        code: 'print(42)',
      }),
    ).resolves.toMatchObject({
      response: {
        output: '42',
        result: '42',
        imageGenerated: true,
        generatedFiles: [],
      },
      generatedFiles: [
        {
          type: 'image/png',
          uploadState: 'active',
        },
      ],
    });

    expect(runPython).toHaveBeenCalledWith('print(42)', { files: inputFiles });
  });
});
