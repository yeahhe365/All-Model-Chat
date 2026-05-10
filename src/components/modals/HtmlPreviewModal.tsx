import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWindowContext } from '../../contexts/WindowContext';
import { useHtmlPreviewModal } from '../../hooks/ui/useHtmlPreviewModal';
import { HtmlPreviewHeader } from './html-preview/HtmlPreviewHeader';
import { HtmlPreviewContent } from './html-preview/HtmlPreviewContent';
import type { LiveArtifactFollowupPayload } from '../../utils/liveArtifactFollowup';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string | null;
  initialTrueFullscreenRequest?: boolean;
  onLiveArtifactFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
}

export const HtmlPreviewModal: React.FC<HtmlPreviewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  initialTrueFullscreenRequest,
  onLiveArtifactFollowUp,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { document: targetDocument } = useWindowContext();

  const {
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
  } = useHtmlPreviewModal({
    isOpen,
    onClose,
    htmlContent,
    initialTrueFullscreenRequest,
    iframeRef,
    onLiveArtifactFollowUp,
  });

  if (!isActuallyOpen || !htmlContent) {
    return null;
  }

  // Skip animation if immediate fullscreen is requested to make it feel instant
  const animationClass = isOpen
    ? initialTrueFullscreenRequest
      ? ''
      : 'modal-enter-animation'
    : 'modal-exit-animation';

  // If direct fullscreen launch is active, hide the modal chrome to prevent flash,
  // but keep it in the DOM so the iframe can be fullscreened.
  const containerClass = isDirectFullscreenLaunch
    ? 'fixed inset-0 z-[2100] opacity-0 pointer-events-none'
    : 'fixed inset-0 bg-black/80 flex items-center justify-center z-[2100]';

  return createPortal(
    <div
      className={containerClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="html-preview-modal-title"
      onClick={isTrueFullscreen ? undefined : onClose}
    >
      <div
        className={`bg-[var(--theme-bg-secondary)] w-full h-full flex flex-col overflow-hidden ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <HtmlPreviewHeader
          title={getPreviewTitle()}
          scale={scale}
          isTrueFullscreen={isTrueFullscreen}
          isPreviewReady={isPreviewReady}
          isScreenshotting={isScreenshotting}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRefresh={handleRefresh}
          onDownload={handleDownload}
          onScreenshot={handleScreenshot}
          onToggleFullscreen={isTrueFullscreen ? exitTrueFullscreen : enterTrueFullscreen}
          onClose={onClose}
        />

        <HtmlPreviewContent iframeRef={iframeRef} htmlContent={htmlContent} scale={scale} />
      </div>
    </div>,
    targetDocument.body,
  );
};
