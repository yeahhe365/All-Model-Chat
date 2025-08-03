import { useState, useEffect, useCallback, useRef } from 'react';
import { logService } from '../utils/appUtils';

declare global {
    interface Window {
        documentPictureInPicture?: {
            requestWindow(options?: { width: number, height: number }): Promise<Window>;
            readonly window?: Window;
        };
    }
}

export const usePictureInPicture = (chatContainerRef: React.RefObject<HTMLElement>) => {
    const [isPipSupported, setIsPipSupported] = useState(false);
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const observerRef = useRef<MutationObserver | null>(null);

    useEffect(() => {
        if ('documentPictureInPicture' in window) {
            setIsPipSupported(true);
        }
    }, []);

    const closePip = useCallback(() => {
        if (pipWindow) {
            pipWindow.close();
            // The pagehide event will set pipWindow to null.
        }
    }, [pipWindow]);

    const openPip = useCallback(async () => {
        if (!isPipSupported || !chatContainerRef.current) return;

        try {
            const pipWin = await window.documentPictureInPicture!.requestWindow({
                width: chatContainerRef.current.clientWidth,
                height: 600,
            });

            // Copy styles
            document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
                pipWin.document.head.appendChild(el.cloneNode(true));
            });
            
            pipWin.document.title = "All Model Chat - PiP";
            pipWin.document.body.className = document.body.className;
            
            const pipRoot = pipWin.document.createElement('div');
            pipRoot.style.height = '100vh'; // Use vh for viewport height
            pipRoot.style.overflow = 'hidden';
            pipRoot.style.display = 'flex';
            pipWin.document.body.appendChild(pipRoot);
            pipWin.document.body.style.overflow = 'hidden'; // prevent scrollbars on body

            const chatClone = chatContainerRef.current.cloneNode(true) as HTMLElement;
            // Override styles for PiP context
            chatClone.style.height = '100%';
            chatClone.style.maxHeight = '100%';
            pipRoot.appendChild(chatClone);

            // Sync and scroll function
            const syncAndScroll = () => {
                if (chatContainerRef.current) {
                    // This is costly, but the simplest way to keep it in sync without a separate React tree.
                    // Note: This will break JS event handlers on the cloned nodes (e.g., code copy buttons).
                    chatClone.innerHTML = chatContainerRef.current.innerHTML;
                    // Always scroll to the bottom in the PiP window.
                    chatClone.scrollTop = chatClone.scrollHeight;
                }
            };
            
            syncAndScroll();

            // Observe for changes in the original chat container
            observerRef.current = new MutationObserver(syncAndScroll);
            observerRef.current.observe(chatContainerRef.current, {
                childList: true,
                subtree: true,
                characterData: true,
            });

            pipWin.addEventListener('pagehide', () => {
                if (observerRef.current) {
                    observerRef.current.disconnect();
                    observerRef.current = null;
                }
                setPipWindow(null);
                logService.info('PiP window closed.');
            }, { once: true });

            setPipWindow(pipWin);
            logService.info('PiP window opened.');

        } catch (error) {
            logService.error('Error opening Picture-in-Picture window:', error);
            setPipWindow(null);
        }
    }, [isPipSupported, chatContainerRef]);

    const togglePip = useCallback(() => {
        if (pipWindow) {
            closePip();
        } else {
            openPip();
        }
    }, [pipWindow, openPip, closePip]);

    return {
        isPipSupported,
        isPipActive: !!pipWindow,
        togglePip,
    };
};
