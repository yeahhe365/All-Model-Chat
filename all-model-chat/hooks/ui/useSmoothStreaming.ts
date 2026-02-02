
import { useState, useEffect, useRef } from 'react';

/**
 * A hook that provides a "typing effect" for streaming text.
 * It catches up to the target text smoothly instead of jumping in large chunks.
 */
export const useSmoothStreaming = (text: string | undefined | null, isStreaming: boolean) => {
    const safeText = text || '';
    // If we are mounting with existing text and streaming, start from 0 to type it out (or use a heuristic to start closer if desired)
    // Here we start from '' if streaming to ensure the visual effect is consistent.
    // If not streaming (e.g. history), we show full text immediately.
    const [displayedText, setDisplayedText] = useState(isStreaming ? '' : safeText);
    
    const displayedTextRef = useRef(isStreaming ? '' : safeText);
    const targetTextRef = useRef(safeText);
    const animationFrameRef = useRef<number | null>(null);

    // Sync target text ref whenever input changes
    useEffect(() => {
        targetTextRef.current = safeText;
        
        // If we stopped streaming, snap to full text immediately to ensure consistency
        if (!isStreaming) {
            if (displayedTextRef.current !== safeText) {
                displayedTextRef.current = safeText;
                setDisplayedText(safeText);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }
    }, [safeText, isStreaming]);

    // Animation Loop
    useEffect(() => {
        if (!isStreaming) return;

        const animate = () => {
            const currentLen = displayedTextRef.current.length;
            const targetLen = targetTextRef.current.length;

            if (currentLen < targetLen) {
                const lag = targetLen - currentLen;
                
                // Adaptive Typing Speed
                // If we are far behind (large chunks or paste), speed up significantly.
                // If we are close, type at a natural reading speed.
                let charsToAdd = 1;
                
                if (lag > 200) charsToAdd = 15;      // Very fast catchup
                else if (lag > 100) charsToAdd = 8;
                else if (lag > 50) charsToAdd = 5;
                else if (lag > 20) charsToAdd = 3;   // Moderate catchup
                else if (lag > 5) charsToAdd = 2;    // Slight catchup
                else charsToAdd = 1;                 // Natural typing

                // Slice safely to avoid grapheme splitting issues (basic approach)
                const nextText = targetTextRef.current.slice(0, currentLen + charsToAdd);
                
                displayedTextRef.current = nextText;
                setDisplayedText(nextText);
                
                animationFrameRef.current = requestAnimationFrame(animate);
            } else if (currentLen > targetLen) {
                // If target text shrank (reset or edit), snap immediately
                displayedTextRef.current = targetTextRef.current;
                setDisplayedText(targetTextRef.current);
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Caught up, keep polling for new chunks in next frames
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isStreaming]);

    return isStreaming ? displayedText : safeText;
};
