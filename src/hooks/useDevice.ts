import { useState, useEffect } from 'react';
import { useWindowContext } from '@/contexts/WindowContext';

const MOBILE_BREAKPOINT = 640; // Matches Tailwind 'sm'

export const useIsMobile = () => {
  const { window: targetWindow } = useWindowContext();
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof targetWindow === 'undefined') return false;
    return targetWindow.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    if (typeof targetWindow === 'undefined') return;
    const mediaQuery = targetWindow.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [targetWindow]);

  return isMobile;
};

export const useResponsiveValue = <T>(mobileValue: T, desktopValue: T, breakpoint: number = 640): T => {
  const { window: targetWindow } = useWindowContext();
  const [value, setValue] = useState<T>(() => {
    if (typeof targetWindow !== 'undefined' && targetWindow.innerWidth < breakpoint) {
      return mobileValue;
    }
    return desktopValue;
  });

  useEffect(() => {
    if (typeof targetWindow === 'undefined') return;
    const mediaQuery = targetWindow.matchMedia(`(max-width: ${breakpoint}px)`);

    const update = () => {
      setValue(mediaQuery.matches ? mobileValue : desktopValue);
    };

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [targetWindow, breakpoint, mobileValue, desktopValue]);

  return value;
};
