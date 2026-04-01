import { useState, useEffect, useRef } from 'react';

/**
 * A hook that provides a "typing effect" for streaming text.
 * It catches up to the target text smoothly instead of jumping in large chunks.
 * OPTIMIZED: Implements a render throttle to prevent ReactMarkdown parsing 
 * from blocking the main thread 60 times per second.
 */
export const useSmoothStreaming = (text: string | undefined | null, isStreaming: boolean) => {
    const safeText = text || '';
    // If we are mounting with existing text and streaming, start from 0 to type it out
    const [displayedText, setDisplayedText] = useState(isStreaming ? '' : safeText);
    
    const displayedTextRef = useRef(isStreaming ? '' : safeText);
    const targetTextRef = useRef(safeText);
    const animationFrameRef = useRef<number | null>(null);
    
    // Throttle reference to limit React state updates (UI rendering)
    const lastRenderTimeRef = useRef<number>(0);

    // Sync target text ref whenever input changes
    useEffect(() => {
        targetTextRef.current = safeText;
        
        // Critical Fix: If tab is hidden, bypass animation to prevent backlog/crash
        // Browser pauses rAF when hidden, but state updates can pile up or be ignored
        if (document.hidden && isStreaming) {
            displayedTextRef.current = safeText;
            setDisplayedText(safeText);
        }
        
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

        const animate = (time: DOMHighResTimeStamp) => {
            // Extra safety: If hidden, stop animating (resumed by effect above)
            if (document.hidden) {
                 animationFrameRef.current = requestAnimationFrame(animate);
                 return;
            }

            const currentLen = displayedTextRef.current.length;
            const targetLen = targetTextRef.current.length;

            if (currentLen < targetLen) {
                const lag = targetLen - currentLen;
                
                // Adaptive Typing Speed
                let charsToAdd = 1;
                if (lag > 200) charsToAdd = 15;
                else if (lag > 100) charsToAdd = 8;
                else if (lag > 50) charsToAdd = 5;
                else if (lag > 20) charsToAdd = 3;
                else if (lag > 5) charsToAdd = 2;

                const nextText = targetTextRef.current.slice(0, currentLen + charsToAdd);
                
                // Always update the internal ref to keep tracking progress
                displayedTextRef.current = nextText;
                
                // THROTTLE LOGIC: Limit React re-renders to ~16fps (approx every 60ms).
                // Markdown AST parsing is heavy; doing it at 60fps causes severe UI jank.
                // We force a render if we reached the very end of the current target string.
                const isFinishedCatchingUp = nextText.length >= targetLen;
                
                if (isFinishedCatchingUp || time - lastRenderTimeRef.current > 60) {
                    setDisplayedText(nextText);
                    lastRenderTimeRef.current = time;
                }
                
                animationFrameRef.current = requestAnimationFrame(animate);
            } else if (currentLen > targetLen) {
                displayedTextRef.current = targetTextRef.current;
                setDisplayedText(targetTextRef.current);
                lastRenderTimeRef.current = time;
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
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
