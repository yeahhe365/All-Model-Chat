import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveTools } from './useLiveTools';

vi.mock('../../services/logService', () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe('useLiveTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends tool responses for uncancelled function calls', async () => {
    const sendToolResponse = vi.fn();

    const { result, unmount } = renderHook(() =>
      useLiveTools({
        clientFunctions: {
          run_local_python: {
            declaration: { name: 'run_local_python' } as any,
            handler: vi.fn(async () => ({ output: '42' })),
          },
        },
        sessionRef: {
          current: Promise.resolve({ sendToolResponse } as any),
        },
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
            result: {
              output: '42',
            },
          },
        },
      ],
    });

    unmount();
  });

  it('does not send tool responses for cancelled calls that finish later', async () => {
    const sendToolResponse = vi.fn();
    let resolveHandler: ((value: unknown) => void) | null = null;

    const { result, unmount } = renderHook(() =>
      useLiveTools({
        clientFunctions: {
          run_local_python: {
            declaration: { name: 'run_local_python' } as any,
            handler: vi.fn(
              () =>
                new Promise((resolve) => {
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
      resolveHandler?.({ output: '42' });
      await toolCallPromise;
    });

    expect(sendToolResponse).not.toHaveBeenCalled();

    unmount();
  });
});
