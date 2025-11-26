
import { useEffect, RefObject } from 'react';
import { useWindowContext } from '../contexts/WindowContext';

type Handler = (event: MouseEvent | TouchEvent) => void;

export const useClickOutside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: Handler,
  enabled: boolean = true
) => {
  const { document: targetDocument } = useWindowContext();

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    targetDocument.addEventListener('mousedown', listener);
    targetDocument.addEventListener('touchstart', listener);

    return () => {
      targetDocument.removeEventListener('mousedown', listener);
      targetDocument.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled, targetDocument]);
};
