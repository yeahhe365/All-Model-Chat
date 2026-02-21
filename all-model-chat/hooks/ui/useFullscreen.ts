import { useCallback } from 'react';
import { useWindowContext } from '../../contexts/WindowContext';

export const useFullscreen = () => {
    const { document: targetDocument } = useWindowContext();

    const enterFullscreen = useCallback(async (element: HTMLElement) => {
        try {
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if ((element as any).webkitRequestFullscreen) {
                (element as any).webkitRequestFullscreen();
            }
        } catch (err) {
            console.error("Error attempting to enable full-screen mode:", err);
            throw err; // Propagate error so callers can handle fallback
        }
    }, []);

    const exitFullscreen = useCallback(async () => {
        if (targetDocument.fullscreenElement || (targetDocument as any).webkitFullscreenElement) {
            if (targetDocument.exitFullscreen) {
                try {
                    await targetDocument.exitFullscreen();
                } catch (err) {
                    console.error("Error attempting to disable full-screen mode:", err);
                }
            } else if ((targetDocument as any).webkitExitFullscreen) {
                try {
                    await (targetDocument as any).webkitExitFullscreen();
                } catch (err) {
                    console.error("Error attempting to disable webkit full-screen mode:", err);
                }
            }
        }
    }, [targetDocument]);

    const toggleFullscreen = useCallback(async (element: HTMLElement) => {
        if (targetDocument.fullscreenElement || (targetDocument as any).webkitFullscreenElement) {
            await exitFullscreen();
        } else {
            await enterFullscreen(element);
        }
    }, [targetDocument, enterFullscreen, exitFullscreen]);

    return { enterFullscreen, exitFullscreen, toggleFullscreen };
};
