import { Type } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { createLocalPythonToolDeclaration, createLocalPythonToolHandler } from './clientFunctionTool';

describe('local Python client function tool helpers', () => {
  it('builds the shared run_local_python declaration used by standard and live chat', () => {
    expect(createLocalPythonToolDeclaration()).toMatchObject({
      name: 'run_local_python',
      parameters: {
        type: Type.OBJECT,
        required: ['code'],
        properties: {
          code: {
            type: Type.STRING,
          },
        },
      },
    });
  });

  it('runs Python with files and adapts output files into chat attachments', async () => {
    const runPython = vi.fn(async () => ({
      output: '42',
      result: '42',
      image: 'base64-image',
      files: [{ name: 'chart.png', type: 'image/png', data: 'Zm9v' }],
    }));
    const handler = createLocalPythonToolHandler({
      getRunOptions: () => ({ files: [] }),
      runPython,
    });

    await expect(handler({ code: 'print(42)' })).resolves.toMatchObject({
      response: {
        output: '42',
        result: '42',
        imageGenerated: true,
        generatedFiles: [{ name: 'chart.png', type: 'image/png' }],
      },
      generatedFiles: [
        {
          name: 'chart.png',
          type: 'image/png',
          uploadState: 'active',
        },
      ],
    });
    expect(runPython).toHaveBeenCalledWith('print(42)', { files: [] });
  });

  it('rejects missing Python code before calling the runner', async () => {
    const runPython = vi.fn();
    const handler = createLocalPythonToolHandler({
      getRunOptions: () => ({ files: [] }),
      runPython,
    });

    await expect(handler({})).rejects.toThrow('run_local_python requires a non-empty "code" string.');
    expect(runPython).not.toHaveBeenCalled();
  });
});
