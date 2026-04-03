
import { useState, useCallback, useEffect, useRef } from 'react';

export const useCopyToClipboard = (resetDuration = 2000) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = window.setTimeout(() => {
        setIsCopied(false);
        timeoutRef.current = null;
      }, resetDuration);
    } catch (err) {
      console.error('Failed to copy text:', err);
      setIsCopied(false);
    }
  }, [resetDuration]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isCopied, copyToClipboard };
};
