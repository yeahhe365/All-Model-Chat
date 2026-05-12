import { useState, useEffect, useRef } from 'react';
import { isLikelyStreamingHtmlArtifact, isLikelyStreamingLiveArtifactInteractionJson } from '@/utils/codeUtils';

const FENCED_CODE_BLOCK_REGEX = /(```[\s\S]*?```|```[\s\S]*$)/g;
const GFM_TABLE_REGEX = /(?:^|\n)\|[^\n]*\|\s*\n\|(?:\s*:?-{3,}:?\s*\|)+/;

const hasStreamingSensitiveMarkdownTable = (text: string) => {
  return text.split(FENCED_CODE_BLOCK_REGEX).some((segment, index) => index % 2 === 0 && GFM_TABLE_REGEX.test(segment));
};

/**
 * A hook that provides a "typing effect" for streaming text.
 * It catches up to the target text smoothly instead of jumping in large chunks.
 * OPTIMIZED: Implements a render throttle to prevent ReactMarkdown parsing
 * from blocking the main thread 60 times per second.
 */
export const useSmoothStreaming = (text: string | undefined | null, isStreaming: boolean) => {
  const safeText = text || '';
  const isDocumentHidden = typeof document !== 'undefined' && document.hidden;
  const shouldBypassAnimation =
    isStreaming &&
    (isDocumentHidden ||
      hasStreamingSensitiveMarkdownTable(safeText) ||
      isLikelyStreamingHtmlArtifact(safeText) ||
      isLikelyStreamingLiveArtifactInteractionJson(safeText));
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

    // Skip character-level animation when the tab is hidden or the content contains
    // markdown tables, because repeatedly reparsing partial table states creates
    // visible structural jank in the chat bubble.
    if (shouldBypassAnimation) {
      displayedTextRef.current = safeText;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // If we stopped streaming, snap to full text immediately to ensure consistency
    if (!isStreaming) {
      if (displayedTextRef.current !== safeText) {
        displayedTextRef.current = safeText;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [safeText, isStreaming, shouldBypassAnimation]);

  // Animation Loop
  useEffect(() => {
    if (!isStreaming || shouldBypassAnimation) return;

    const animate = (time: DOMHighResTimeStamp) => {
      // Extra safety: If the page becomes hidden, stop animating immediately.
      if (typeof document !== 'undefined' && document.hidden) {
        animationFrameRef.current = null;
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

        if (isFinishedCatchingUp) {
          animationFrameRef.current = null;
        } else {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      } else if (currentLen > targetLen) {
        displayedTextRef.current = targetTextRef.current;
        setDisplayedText(targetTextRef.current);
        lastRenderTimeRef.current = time;
        animationFrameRef.current = null;
      } else {
        animationFrameRef.current = null;
      }
    };

    if (!animationFrameRef.current && displayedTextRef.current !== targetTextRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isStreaming, safeText, shouldBypassAnimation]);

  return shouldBypassAnimation ? safeText : isStreaming ? displayedText : safeText;
};
