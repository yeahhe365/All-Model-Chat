import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 640; // Matches Tailwind 'sm'

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    
    // Set initial value based on media query specifically to ensure sync
    setIsMobile(mediaQuery.matches);

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
};

export const useIsTouch = () => {
  const [isTouch, setIsTouch] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // (pointer: coarse) is the standard way to detect accurate touch screens (smartphones/tablets)
    // vs mouse/trackpad users who might happen to have a touchscreen laptop.
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    
    const handleChange = (e: MediaQueryListEvent) => {
        setIsTouch(e.matches);
    };

    // Initial check
    const hasCoarsePointer = mediaQuery.matches;
    // Fallback for older browsers or specific devices relying on maxTouchPoints
    const hasTouchPoints = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || ('ontouchstart' in window));
    
    // We prefer the media query result, but fallback if media query isn't supported or is 'not all'
    setIsTouch(hasCoarsePointer || (mediaQuery.media === 'not all' && hasTouchPoints));

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isTouch;
};

export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // (pointer: fine) typically indicates a mouse or trackpad is the primary input
    // This helps distinguish desktop/laptops (even with small windows) from mobile devices.
    const mediaQuery = window.matchMedia('(pointer: fine)');
    
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    
    setIsDesktop(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
};
