
import { useState, useEffect, useCallback, RefObject } from 'react';
import { useWindowContext } from '../../contexts/WindowContext';
import { sanitizeFilename, exportElementAsPng, triggerDownload } from '../../utils/exportUtils';

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

export const useHtmlPreviewModal = ({
    isOpen,
    onClose,
    htmlContent,
    initialTrueFullscreenRequest,
    iframeRef
}: UseHtmlPreviewModalProps) => {
    const [isTrueFullscreen, setIsTrueFullscreen] = useState(false);
    const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);
    const [scale, setScale] = useState(1);
    const [isScreenshotting, setIsScreenshotting] = useState(false);
    
    // Track if we are in the process of a direct launch to prevent UI flash
    const [isDirectFullscreenLaunch, setIsDirectFullscreenLaunch] = useState(initialTrueFullscreenRequest);
    
    const { document: targetDocument } = useWindowContext();

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setIsActuallyOpen(true);
            setScale(1);
            setIsDirectFullscreenLaunch(initialTrueFullscreenRequest);
        } else {
            const timer = setTimeout(() => setIsActuallyOpen(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialTrueFullscreenRequest]);

    // Zoom Handlers
    const handleZoomIn = useCallback(() => setScale(s => Math.min(MAX_ZOOM, s + ZOOM_STEP)), []);
    const handleZoomOut = useCallback(() => setScale(s => Math.max(MIN_ZOOM, s - ZOOM_STEP)), []);

    // Fullscreen Logic
    const enterTrueFullscreen = useCallback(async () => {
        const element = iframeRef.current;
        if (!element) return;

        try {
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if ((element as any).webkitRequestFullscreen) { // Safari
                (element as any).webkitRequestFullscreen();
            }
        } catch (err) {
            console.error("Error attempting to enable full-screen mode:", err);
            // If fullscreen fails, show the modal UI so the user isn't stuck with an invisible overlay
            setIsDirectFullscreenLaunch(false);
        }
    }, [iframeRef]);

    const exitTrueFullscreen = useCallback(async () => {
        if (targetDocument.fullscreenElement || (targetDocument as any).webkitFullscreenElement) {
            if (targetDocument.exitFullscreen) {
                try {
                    await targetDocument.exitFullscreen();
                } catch (err) {
                    console.error("Error attempting to disable full-screen mode:", err);
                }
            } else if ((targetDocument as any).webkitExitFullscreen) { // Safari
                try {
                    await (targetDocument as any).webkitExitFullscreen();
                } catch (err) {
                    console.error("Error attempting to disable webkit full-screen mode:", err);
                }
            }
        }
    }, [targetDocument]);

    // Sync Fullscreen State
    useEffect(() => {
        const handleFullscreenChange = () => {
            const newlyFullscreenElement = targetDocument.fullscreenElement || (targetDocument as any).webkitFullscreenElement;
            const isNowInTrueFullscreenForIframe = newlyFullscreenElement === iframeRef.current;

            if (isTrueFullscreen && !isNowInTrueFullscreenForIframe) {
                // If we launched directly to fullscreen, exiting fullscreen should close the modal completely.
                if (initialTrueFullscreenRequest) {
                    onClose();
                    return;
                }
            }
            setIsTrueFullscreen(isNowInTrueFullscreenForIframe);
        };
    
        targetDocument.addEventListener('fullscreenchange', handleFullscreenChange);
        targetDocument.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    
        return () => {
            targetDocument.removeEventListener('fullscreenchange', handleFullscreenChange);
            targetDocument.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, [isTrueFullscreen, iframeRef, initialTrueFullscreenRequest, onClose, targetDocument]);

    // Keyboard Handling (Escape)
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isTrueFullscreen) {
                    // Browser will handle exiting true fullscreen.
                } else {
                    if (isOpen) onClose();
                }
            }
        };

        if (isOpen) {
            targetDocument.addEventListener('keydown', handleKeyDown);
            if (initialTrueFullscreenRequest && iframeRef.current) {
                // Attempt immediate fullscreen entrance. 
                enterTrueFullscreen();
            }
        }
        return () => {
            targetDocument.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, initialTrueFullscreenRequest, enterTrueFullscreen, isTrueFullscreen, targetDocument, iframeRef]);

    // Helper functions for content extraction
    const getPreviewTitle = useCallback(() => {
        let title = "HTML Preview";
        try {
            const titleMatch = htmlContent?.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
            }
        } catch (e) { }
        return title;
    }, [htmlContent]);

    const handleDownload = useCallback(() => {
        if (!htmlContent) return;
        const title = getPreviewTitle();
        const filename = `${sanitizeFilename(title)}.html`;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, filename);
    }, [htmlContent, getPreviewTitle]);

    const handleScreenshot = useCallback(async () => {
        // Ensure contentDocument is accessible (requires allow-same-origin in sandbox)
        if (!iframeRef.current?.contentDocument || isScreenshotting) return;
        
        setIsScreenshotting(true);
        try {
            // Capture the whole document element to ensure background colors and full layout are captured
            const elementToCapture = iframeRef.current.contentDocument.documentElement;
            const title = getPreviewTitle();
            const filename = `${sanitizeFilename(title)}-screenshot.png`;
            
            await exportElementAsPng(elementToCapture as HTMLElement, filename, {
                // Allow styles to dictate background, or default to transparent which renders as white in most viewers or explicit if set in html
                backgroundColor: null,
                scale: 2,
            });
        } catch (err) {
            console.error("Failed to take screenshot of iframe content:", err);
            alert("Sorry, the screenshot could not be captured. Please check the console for errors.");
        } finally {
            setIsScreenshotting(false);
        }
    }, [isScreenshotting, iframeRef, getPreviewTitle]);

    const handleRefresh = useCallback(() => {
        if (iframeRef.current && htmlContent) {
            iframeRef.current.srcdoc = ' '; 
            requestAnimationFrame(() => {
                if (iframeRef.current) { 
                    iframeRef.current.srcdoc = htmlContent;
                }
            });
        }
    }, [htmlContent, iframeRef]);

    return {
        isActuallyOpen,
        isTrueFullscreen,
        isDirectFullscreenLaunch,
        scale,
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
        MAX_ZOOM
    };
};
