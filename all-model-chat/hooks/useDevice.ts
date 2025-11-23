import { useState, useEffect } from 'react';
import { useWindowContext } from '../contexts/WindowContext';

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
    
    // Set initial value based on media query specifically to ensure sync
    setIsMobile(mediaQuery.matches);

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [targetWindow]);

  return isMobile;
};

export const useIsTouch = () => {
  const { window: targetWindow } = useWindowContext();
  const [isTouch, setIsTouch] = useState<boolean>(false);

  useEffect(() => {
    if (typeof targetWindow === 'undefined') return;

    // (pointer: coarse) is the standard way to detect accurate touch screens (smartphones/tablets)
    // vs mouse/trackpad users who might happen to have a touchscreen laptop.
    const mediaQuery = targetWindow.matchMedia('(pointer: coarse)');
    
    const handleChange = (e: MediaQueryListEvent) => {
        setIsTouch(e.matches);
    };

    // Initial check
    const hasCoarsePointer = mediaQuery.matches;
    // Fallback for older browsers or specific devices relying on maxTouchPoints
    const hasTouchPoints = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || ('ontouchstart' in targetWindow));
    
    // We prefer the media query result, but fallback if media query isn't supported or is 'not all'
    setIsTouch(hasCoarsePointer || (mediaQuery.media === 'not all' && hasTouchPoints));

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [targetWindow]);

  return isTouch;
};

export const useIsDesktop = () => {
  const { window: targetWindow } = useWindowContext();
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    if (typeof targetWindow === 'undefined') return;
    
    // (pointer: fine) typically indicates a mouse or trackpad is the primary input
    // This helps distinguish desktop/laptops (even with small windows) from mobile devices.
    const mediaQuery = targetWindow.matchMedia('(pointer: fine)');
    
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    
    setIsDesktop(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [targetWindow]);

  return isDesktop;
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