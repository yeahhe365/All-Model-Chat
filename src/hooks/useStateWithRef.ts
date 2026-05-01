import { useCallback, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

export const useStateWithRef = <T,>(initialValue: T): readonly [T, Dispatch<SetStateAction<T>>, MutableRefObject<T>] => {
  const [state, setState] = useState(initialValue);
  const ref = useRef(state);

  const setStateAndRef = useCallback((value: SetStateAction<T>) => {
    const nextValue = typeof value === 'function' ? (value as (previousState: T) => T)(ref.current) : value;
    ref.current = nextValue;
    setState(() => nextValue);
  }, []);

  return [state, setStateAndRef, ref] as const;
};
