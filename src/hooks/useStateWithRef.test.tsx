import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook } from '@/test/testUtils';
import { useStateWithRef } from './useStateWithRef';

describe('useStateWithRef', () => {
  it('updates the ref synchronously when setting state', () => {
    const { result, unmount } = renderHook(() => useStateWithRef(false));

    let refValueAfterSet: boolean | undefined;
    act(() => {
      const [, setValue, valueRef] = result.current;
      setValue(true);
      refValueAfterSet = valueRef.current;
    });

    expect(refValueAfterSet).toBe(true);
    expect(result.current[0]).toBe(true);
    expect(result.current[2].current).toBe(true);
    unmount();
  });

  it('uses the latest ref value for consecutive functional updates', () => {
    const { result, unmount } = renderHook(() => useStateWithRef(0));

    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 1);
      setValue((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(result.current[2].current).toBe(2);
    unmount();
  });
});
