import { useState, useEffect, useCallback, RefObject } from 'react';
import { useWindowContext } from '../../contexts/WindowContext';
import { createManagedObjectUrl } from '../../services/objectUrlManager';
import { sanitizeFilename, triggerDownload } from '../../utils/export/core';
import { useFullscreen } from './useFullscreen';
import {
  buildHtmlPreviewSrcDoc,
  createStaticPreviewSnapshotContainer,
  HTML_PREVIEW_MESSAGE_CHANNEL,
} from '../../utils/htmlPreview';

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;

interface UseHtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string | null;
  initialTrueFullscreenRequest?: boolean;
  iframeRef: RefObject<HTMLIFrameElement>;
}

type DocumentWithWebkitFullscreen = Document & {
  webkitFullscreenElement?: Element | null;
};

type HtmlPreviewBridgeMessage = {
  channel?: string;
  event?: 'ready' | 'escape';
};

export const useHtmlPreviewModal = ({
  isOpen,
  onClose,
  htmlContent,
  initialTrueFullscreenRequest,
  iframeRef,
}: UseHtmlPreviewModalProps) => {
  const [isTrueFullscreen, setIsTrueFullscreen] = useState(false);
  const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);
  const [scale, setScale] = useState(1);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  const [isDirectFullscreenLaunch, setIsDirectFullscreenLaunch] = useState(initialTrueFullscreenRequest);

  const { document: targetDocument, window: targetWindow } = useWindowContext();
  const { enterFullscreen, exitFullscreen } = useFullscreen();

  useEffect(() => {
    if (isOpen) {
      setIsActuallyOpen(true);
      setScale(1);
      setIsPreviewReady(false);
      setIsDirectFullscreenLaunch(initialTrueFullscreenRequest);
    } else {
      const timer = setTimeout(() => setIsActuallyOpen(false), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, initialTrueFullscreenRequest, htmlContent]);

  const handleZoomIn = useCallback(() => setScale((s) => Math.min(MAX_ZOOM, s + ZOOM_STEP)), []);
  const handleZoomOut = useCallback(() => setScale((s) => Math.max(MIN_ZOOM, s - ZOOM_STEP)), []);

  const enterTrueFullscreen = useCallback(async () => {
    const element = iframeRef.current;
    if (!element) return;
    try {
      await enterFullscreen(element);
    } catch {
      setIsDirectFullscreenLaunch(false);
    }
  }, [iframeRef, enterFullscreen]);

  const exitTrueFullscreen = useCallback(async () => {
    await exitFullscreen();
  }, [exitFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const newlyFullscreenElement =
        targetDocument.fullscreenElement || (targetDocument as DocumentWithWebkitFullscreen).webkitFullscreenElement;
      const isNowInTrueFullscreenForIframe = newlyFullscreenElement === iframeRef.current;

      if (isTrueFullscreen && !isNowInTrueFullscreenForIframe) {
        if (initialTrueFullscreenRequest) {
          onClose();
          return;
        }
      }
      setIsTrueFullscreen(isNowInTrueFullscreenForIframe);
    };

    targetDocument.addEventListener('fullscreenchange', handleFullscreenChange);
    targetDocument.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      targetDocument.removeEventListener('fullscreenchange', handleFullscreenChange);
      targetDocument.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isTrueFullscreen, iframeRef, initialTrueFullscreenRequest, onClose, targetDocument]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleMessage = (event: MessageEvent<HtmlPreviewBridgeMessage>) => {
      const data = event.data;
      if (!data || data.channel !== HTML_PREVIEW_MESSAGE_CHANNEL) {
        return;
      }

      const iframeWindow = iframeRef.current?.contentWindow;
      if (iframeWindow && event.source !== iframeWindow) {
        return;
      }

      if (data.event === 'ready') {
        setIsPreviewReady(true);
        return;
      }

      if (data.event === 'escape' && !isTrueFullscreen) {
        onClose();
      }
    };

    targetWindow.addEventListener('message', handleMessage);
    return () => {
      targetWindow.removeEventListener('message', handleMessage);
    };
  }, [iframeRef, isOpen, isTrueFullscreen, onClose, targetWindow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isTrueFullscreen) {
          // Browser handles exiting true fullscreen
        } else {
          if (isOpen) onClose();
        }
      }
    };

    if (isOpen) {
      targetDocument.addEventListener('keydown', handleKeyDown);
      if (initialTrueFullscreenRequest && iframeRef.current) {
        enterTrueFullscreen();
      }
    }
    return () => {
      targetDocument.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, initialTrueFullscreenRequest, enterTrueFullscreen, isTrueFullscreen, targetDocument, iframeRef]);

  const getPreviewTitle = useCallback(() => {
    let title = 'HTML Preview';
    try {
      const titleMatch = htmlContent?.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }
    } catch {
      // Fall back to the default preview title if parsing fails.
    }
    return title;
  }, [htmlContent]);

  const handleDownload = useCallback(() => {
    if (!htmlContent) return;
    const title = getPreviewTitle();
    const filename = `${sanitizeFilename(title)}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = createManagedObjectUrl(blob);
    triggerDownload(url, filename);
  }, [htmlContent, getPreviewTitle]);

  const handleScreenshot = useCallback(async () => {
    if (!htmlContent || !isPreviewReady || isScreenshotting) return;

    setIsScreenshotting(true);
    let cleanup = () => {};
    try {
      const { exportElementAsPng } = await import('../../utils/export/image');
      const snapshot = createStaticPreviewSnapshotContainer(htmlContent, targetDocument);
      cleanup = snapshot.cleanup;
      const title = getPreviewTitle();
      const filename = `${sanitizeFilename(title)}-screenshot.png`;

      await exportElementAsPng(snapshot.container, filename, {
        backgroundColor: null,
        scale: 2,
      });
    } catch (err) {
      console.error('Failed to take screenshot of iframe content:', err);
      alert('Sorry, the screenshot could not be captured. Please check the console for errors.');
    } finally {
      cleanup();
      setIsScreenshotting(false);
    }
  }, [getPreviewTitle, htmlContent, isPreviewReady, isScreenshotting, targetDocument]);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && htmlContent) {
      setIsPreviewReady(false);
      iframeRef.current.srcdoc = ' ';
      requestAnimationFrame(() => {
        if (iframeRef.current) {
          iframeRef.current.srcdoc = buildHtmlPreviewSrcDoc(htmlContent);
        }
      });
    }
  }, [htmlContent, iframeRef]);

  return {
    isActuallyOpen,
    isTrueFullscreen,
    isDirectFullscreenLaunch,
    scale,
    isPreviewReady,
    isScreenshotting,
    handleZoomIn,
    handleZoomOut,
    handleDownload,
    handleScreenshot,
    handleRefresh,
    enterTrueFullscreen,
    exitTrueFullscreen,
    getPreviewTitle,
    MIN_ZOOM,
    MAX_ZOOM,
  };
};
