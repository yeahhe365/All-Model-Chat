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
            pipWin.document.body.style.overflow = 'hidden'; // prevent scrollbars on body
            
            const pipRoot = pipWin.document.createElement('div');
            pipRoot.style.height = '100vh';
            pipRoot.style.overflow = 'hidden';
            pipRoot.style.display = 'flex';
            pipRoot.style.flexDirection = 'column'; // Stack header and content
            pipRoot.style.backgroundColor = 'var(--theme-bg-primary)'; // Ensure bg color
            pipWin.document.body.appendChild(pipRoot);

            // Add a header to the PiP window
            const pipHeader = pipWin.document.createElement('div');
            pipHeader.style.padding = '8px 12px';
            pipHeader.style.backgroundColor = 'var(--theme-bg-secondary)';
            pipHeader.style.borderBottom = '1px solid var(--theme-border-primary)';
            pipHeader.style.color = 'var(--theme-text-primary)';
            pipHeader.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
            pipHeader.style.fontSize = '13px';
            pipHeader.style.fontWeight = '600';
            pipHeader.style.flexShrink = '0';
            pipHeader.style.display = 'flex';
            pipHeader.style.alignItems = 'center';
            pipHeader.style.gap = '8px';
            
            // Add an icon to the header
            pipHeader.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>
                <span>All Model Chat - PiP</span>
            `;
            pipRoot.appendChild(pipHeader);

            const chatClone = chatContainerRef.current.cloneNode(true) as HTMLElement;
            // Override styles for PiP context
            chatClone.style.height = '100%';
            chatClone.style.maxHeight = '100%';
            chatClone.style.flexGrow = '1';
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
