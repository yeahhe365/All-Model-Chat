import { act } from 'react';
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

vi.mock('@/features/local-python/pyodideService', () => ({
  pyodideService: {
    runPython: mockRunPython,
  },
}));

import { usePyodide } from './usePyodide';
import { renderHook } from '@/test/testUtils';

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
    const first = renderHook(() => usePyodide(), { attachToDocument: true });

    await act(async () => {
      await first.result.current.runCode('print("hello")');
    });

    expect(first.result.current.hasRun).toBe(true);
    first.unmount();

    const second = renderHook(() => usePyodide(), { attachToDocument: true });
    expect(second.result.current.hasRun).toBe(false);
    expect(second.result.current.output).toBeNull();
    second.unmount();
  });

  it('restores execution state across remounts when an explicit cache key is provided', async () => {
    const first = renderHook(() => usePyodide('message-1:block-3'), { attachToDocument: true });

    await act(async () => {
      await first.result.current.runCode('print("hello")');
    });

    expect(first.result.current.hasRun).toBe(true);
    first.unmount();

    const second = renderHook(() => usePyodide('message-1:block-3'), { attachToDocument: true });
    expect(second.result.current.hasRun).toBe(true);
    expect(second.result.current.output).toBe('ok');
    second.unmount();
  });
});
