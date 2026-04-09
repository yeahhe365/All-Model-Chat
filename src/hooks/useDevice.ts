
import { useMemo, useSyncExternalStore } from 'react';
import { useWindowContext } from '../contexts/useWindowContext';

const MOBILE_BREAKPOINT = 640; // Matches Tailwind 'sm'
const DESKTOP_INTERACTION_QUERY = '(hover: hover) and (pointer: fine)';

const useMediaQuery = (query: string, fallback = false) => {
  const { window: targetWindow } = useWindowContext();

  const subscribe = useMemo(
    () => (onStoreChange: () => void) => {
      if (typeof targetWindow === 'undefined') {
        return () => {};
      }

      const mediaQuery = targetWindow.matchMedia(query);
      mediaQuery.addEventListener('change', onStoreChange);
      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    [query, targetWindow]
  );

  const getSnapshot = useMemo(
    () => () => {
      if (typeof targetWindow === 'undefined') return fallback;
      return targetWindow.matchMedia(query).matches;
    },
    [fallback, query, targetWindow]
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
};

export const useIsMobile = () => {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
};

export const useIsDesktop = () => {
  return useMediaQuery(DESKTOP_INTERACTION_QUERY);
};

export const useResponsiveValue = <T>(mobileValue: T, desktopValue: T, breakpoint: number = 640): T => {
    const isMobile = useMediaQuery(`(max-width: ${breakpoint}px)`);
    return isMobile ? mobileValue : desktopValue;
};
