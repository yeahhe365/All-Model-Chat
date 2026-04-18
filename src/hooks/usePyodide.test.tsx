import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRunPython } = vi.hoisted(() => ({
  mockRunPython: vi.fn(async () => ({
    output: 'ok',
    image: undefined,
    files: [],
    result: undefined,
    status: 'success' as const,
  })),
}));

vi.mock('../services/pyodideService', () => ({
  pyodideService: {
    runPython: mockRunPython,
  },
}));

import { usePyodide } from './usePyodide';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
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
      container.remove();
    },
  };
};

describe('usePyodide', () => {
  beforeEach(() => {
    mockRunPython.mockClear();
    mockRunPython.mockResolvedValue({
      output: 'ok',
      image: undefined,
      files: [],
      result: undefined,
      status: 'success',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not persist execution state across remounts when no explicit cache key is provided', async () => {
    const first = renderHook(() => usePyodide());

    await act(async () => {
      await first.result.current.runCode('print("hello")');
    });

    expect(first.result.current.hasRun).toBe(true);
    first.unmount();

    const second = renderHook(() => usePyodide());
    expect(second.result.current.hasRun).toBe(false);
    expect(second.result.current.output).toBeNull();
    second.unmount();
  });

  it('restores execution state across remounts when an explicit cache key is provided', async () => {
    const first = renderHook(() => usePyodide('message-1:block-3'));

    await act(async () => {
      await first.result.current.runCode('print("hello")');
    });

    expect(first.result.current.hasRun).toBe(true);
    first.unmount();

    const second = renderHook(() => usePyodide('message-1:block-3'));
    expect(second.result.current.hasRun).toBe(true);
    expect(second.result.current.output).toBe('ok');
    second.unmount();
  });
});
