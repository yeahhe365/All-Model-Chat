import { useState, useEffect, useCallback } from 'react';
import { logService } from '../utils/appUtils';

declare global {
    interface Window {
        documentPictureInPicture?: {
            requestWindow(options?: { width: number, height: number }): Promise<Window>;
            readonly window?: Window;
        };
    }
}

export const usePictureInPicture = () => {
    const [isPipSupported, setIsPipSupported] = useState(false);
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if ('documentPictureInPicture' in window) {
            setIsPipSupported(true);
        }
    }, []);

    const closePip = useCallback(() => {
        if (pipWindow) {
            // The 'pagehide' event listener handles the state cleanup
            pipWindow.close();
        }
    }, [pipWindow]);

    const openPip = useCallback(async () => {
        if (!isPipSupported || pipWindow) return;

        try {
            const pipWin = await window.documentPictureInPicture!.requestWindow({
                width: 500, // A reasonable default width
                height: 700, // A reasonable default height
            });

            // Copy all head elements from the main document to the PiP window.
            // This ensures styles, scripts (like Tailwind), and other configurations are available.
            document.head.childNodes.forEach(node => {
                pipWin.document.head.appendChild(node.cloneNode(true));
            });
            
            pipWin.document.title = "All Model Chat - PiP";
            pipWin.document.body.className = document.body.className;
            pipWin.document.body.style.margin = '0';
            pipWin.document.body.style.overflow = 'hidden';

            // Ensure full height/width for layout
            pipWin.document.documentElement.style.height = '100%';
            pipWin.document.body.style.height = '100%';
            pipWin.document.body.style.width = '100%';

            // Create a root container for the React portal
            const container = pipWin.document.createElement('div');
            container.id = 'pip-root';
            container.style.height = '100%';
            container.style.width = '100%';
            pipWin.document.body.appendChild(container);

            // Listen for when the user closes the PiP window
            pipWin.addEventListener('pagehide', () => {
                setPipWindow(null);
                setPipContainer(null);
                logService.info('PiP window closed.');
            }, { once: true });

            setPipWindow(pipWin);
            setPipContainer(container);
            logService.info('PiP window opened.');

        } catch (error) {
            logService.error('Error opening Picture-in-Picture window:', error);
            setPipWindow(null);
            setPipContainer(null);
        }
    }, [isPipSupported, pipWindow]);

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
        pipContainer,
    };
};
