import { useEffect, useRef } from 'react';

type AriaLive = 'polite' | 'assertive' | 'off';

interface LiveRegionOptions {
  priority?: AriaLive;
  timeout?: number;
}

export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Create live region container if it doesn't exist
    if (!document.getElementById('live-region-container')) {
      const container = document.createElement('div');
      container.id = 'live-region-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);
      liveRegionRef.current = container;
    } else {
      liveRegionRef.current = document.getElementById('live-region-container');
    }

    return () => {
      // Clean up on unmount
      if (liveRegionRef.current && liveRegionRef.current.id === 'live-region-container') {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  const announce = (message: string, options: LiveRegionOptions = {}) => {
    const { priority = 'polite', timeout = 1000 } = options;
    
    if (!liveRegionRef.current) return;

    // Update priority if needed
    if (liveRegionRef.current.getAttribute('aria-live') !== priority) {
      liveRegionRef.current.setAttribute('aria-live', priority);
    }

    // Clear previous message
    liveRegionRef.current.textContent = '';
    
    // Add new message after a brief delay to ensure screen reader picks it up
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
        
        // Clear after timeout to keep region clean
        setTimeout(() => {
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = '';
          }
        }, timeout);
      }
    }, 50);
  };

  return { announce };
};