import { useState, useEffect, useCallback, RefObject } from 'react';
import { useWindowContext } from '../../contexts/WindowContext';
import { createManagedObjectUrl } from '../../services/objectUrlManager';
import { sanitizeFilename, triggerDownload } from '../../utils/export/core';
import { useFullscreen } from './useFullscreen';
import {
  buildHtmlPreviewSrcDoc,
  createStaticPreviewSnapshotContainer,
  HTML_PREVIEW_CLEAR_SELECTION_EVENT,
  HTML_PREVIEW_DIAGNOSTIC_EVENT,
  HTML_PREVIEW_MESSAGE_CHANNEL,
} from '../../utils/htmlPreview';
import { useI18n } from '../../contexts/I18nContext';
import {
  normalizeLiveArtifactFollowupPayload,
  type LiveArtifactFollowupPayload,
} from '../../utils/liveArtifactFollowup';
import {
  createRelayedLiveArtifactSelectionDetail,
  dispatchLiveArtifactSelection,
  LIVE_ARTIFACT_CLEAR_SELECTION_EVENT,
} from '../text-selection/liveArtifactSelection';

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;

interface UseHtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string | null;
  initialTrueFullscreenRequest?: boolean;
  iframeRef: RefObject<HTMLIFrameElement>;
  onLiveArtifactFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
}

type DocumentWithWebkitFullscreen = Document & {
  webkitFullscreenElement?: Element | null;
};

type HtmlPreviewBridgeMessage = {
  channel?: string;
  event?: 'ready' | 'escape' | 'followup' | 'selection' | 'diagnostic';
  payload?: unknown;
};

export const useHtmlPreviewModal = ({
  isOpen,
  onClose,
  htmlContent,
  initialTrueFullscreenRequest,
  iframeRef,
  onLiveArtifactFollowUp,
}: UseHtmlPreviewModalProps) => {
  const { t } = useI18n();
  const [isTrueFullscreen, setIsTrueFullscreen] = useState(false);
  const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);
  const [scale, setScale] = useState(1);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  const [isDirectFullscreenLaunch, setIsDirectFullscreenLaunch] = useState(initialTrueFullscreenRequest);

  const { document: targetDocument, window: targetWindow } = useWindowContext();
  const { enterFullscreen, exitFullscreen } = useFullscreen();
  const postClearSelection = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        channel: HTML_PREVIEW_MESSAGE_CHANNEL,
        event: HTML_PREVIEW_CLEAR_SELECTION_EVENT,
      },
      '*',
    );
  }, [iframeRef]);

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
        return;
      }

      if (data.event === 'selection') {
        dispatchLiveArtifactSelection(
          targetWindow,
          createRelayedLiveArtifactSelectionDetail(iframeRef.current, data.payload, scale),
        );
        return;
      }

      if (data.event === 'followup') {
        const payload = normalizeLiveArtifactFollowupPayload(data.payload);
        if (!payload) {
          console.warn('Ignored invalid Live Artifact follow-up payload.');
          return;
        }

        onLiveArtifactFollowUp?.(payload);
        return;
      }

      if (data.event === HTML_PREVIEW_DIAGNOSTIC_EVENT) {
        console.warn('Live Artifact preview diagnostic:', data.payload);
      }
    };

    targetWindow.addEventListener('message', handleMessage);
    return () => {
      targetWindow.removeEventListener('message', handleMessage);
    };
  }, [iframeRef, isOpen, isTrueFullscreen, onClose, onLiveArtifactFollowUp, scale, targetWindow]);

  useEffect(() => {
    const handleClearSelection = () => {
      postClearSelection();
    };

    targetWindow.addEventListener(LIVE_ARTIFACT_CLEAR_SELECTION_EVENT, handleClearSelection);
    return () => targetWindow.removeEventListener(LIVE_ARTIFACT_CLEAR_SELECTION_EVENT, handleClearSelection);
  }, [postClearSelection, targetWindow]);

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
    let title = t('htmlPreview_title');
    try {
      const titleMatch = htmlContent?.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }
    } catch {
      // Fall back to the default preview title if parsing fails.
    }
    return title;
  }, [htmlContent, t]);

  const handleDownload = useCallback(() => {
    if (!htmlContent) return;
    const title = getPreviewTitle();
    const filename = `${sanitizeFilename(title)}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = createManagedObjectUrl(blob);
    triggerDownload(url, filename);
  }, [htmlContent, getPreviewTitle]);

  const getCurrentPreviewScreenshotTarget = useCallback((): HTMLElement | null => {
    try {
      const previewDocument = iframeRef.current?.contentDocument;
      return previewDocument?.body || previewDocument?.documentElement || null;
    } catch {
      return null;
    }
  }, [iframeRef]);

  const handleScreenshot = useCallback(async () => {
    if (!htmlContent || !isPreviewReady || isScreenshotting) return;

    setIsScreenshotting(true);
    let cleanup = () => {};
    try {
      const { exportElementAsPng } = await import('../../utils/export/image');
      const target = getCurrentPreviewScreenshotTarget();
      const screenshotTarget =
        target ??
        (() => {
          const snapshot = createStaticPreviewSnapshotContainer(htmlContent, targetDocument);
          cleanup = snapshot.cleanup;
          return snapshot.container;
        })();
      const title = getPreviewTitle();
      const filename = `${sanitizeFilename(title)}-screenshot.png`;

      await exportElementAsPng(screenshotTarget, filename, {
        backgroundColor: null,
        scale: 2,
        messages: {
          imageTooLarge: t('export_image_too_large'),
          exportFailed: (message) => t('export_failed_with_message').replace('{message}', message),
        },
      });
    } catch (err) {
      console.error('Failed to take screenshot of iframe content:', err);
      alert(t('htmlPreview_screenshot_failed'));
    } finally {
      cleanup();
      setIsScreenshotting(false);
    }
  }, [
    getCurrentPreviewScreenshotTarget,
    getPreviewTitle,
    htmlContent,
    isPreviewReady,
    isScreenshotting,
    t,
    targetDocument,
  ]);

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
