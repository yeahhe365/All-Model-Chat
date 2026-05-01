import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveTools } from './useLiveTools';
import { renderHook } from '@/test/testUtils';

vi.mock('../../services/logService', () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useLiveTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends tool responses for uncancelled function calls', async () => {
    const sendToolResponse = vi.fn();
    const onGeneratedFiles = vi.fn();
    const generatedFile = { id: 'file-1', name: 'chart.png', type: 'image/png' } as any;

    const { result, unmount } = renderHook(() =>
      useLiveTools({
        clientFunctions: {
          run_local_python: {
            declaration: { name: 'run_local_python' } as any,
            handler: vi.fn(async () => ({
              response: { output: '42' },
              generatedFiles: [generatedFile],
            })),
          },
        },
        sessionRef: {
          current: Promise.resolve({ sendToolResponse } as any),
        },
        onGeneratedFiles,
      }),
    );

    await act(async () => {
      await result.current.handleToolCall({
        functionCalls: [
          {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        ],
      } as any);
    });

    expect(sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        {
          id: 'call-1',
          name: 'run_local_python',
          response: {
            output: '42',
          },
        },
      ],
    });
    expect(onGeneratedFiles).toHaveBeenCalledWith([generatedFile]);

    unmount();
  });

  it('does not send tool responses for cancelled calls that finish later', async () => {
    const sendToolResponse = vi.fn();
    let resolveHandler: ((value: { response: { output: string }; generatedFiles: [] }) => void) | null = null;

    const { result, unmount } = renderHook(() =>
      useLiveTools({
        clientFunctions: {
          run_local_python: {
            declaration: { name: 'run_local_python' } as any,
            handler: vi.fn(
              (_args, options) =>
                new Promise<{ response: { output: string }; generatedFiles: [] }>((resolve, reject) => {
                  options?.abortSignal?.addEventListener('abort', () => {
                    const abortError = new Error('aborted');
                    abortError.name = 'AbortError';
                    reject(abortError);
                  });
                  resolveHandler = resolve;
                }),
            ),
          },
        },
        sessionRef: {
          current: Promise.resolve({ sendToolResponse } as any),
        },
      }),
    );

    let toolCallPromise: Promise<void> | undefined;
    await act(async () => {
      toolCallPromise = result.current.handleToolCall({
        functionCalls: [
          {
            id: 'call-1',
            name: 'run_local_python',
            args: { code: 'print(42)' },
          },
        ],
      } as any);
    });

    act(() => {
      result.current.cancelToolCalls(['call-1']);
    });

    await act(async () => {
      resolveHandler?.({ response: { output: '42' }, generatedFiles: [] });
      await toolCallPromise;
    });

    expect(sendToolResponse).not.toHaveBeenCalled();

    unmount();
  });
});
