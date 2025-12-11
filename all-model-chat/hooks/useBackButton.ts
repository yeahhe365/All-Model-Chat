
import { useEffect, useRef } from 'react';

/**
 * Hook to handle Android "Back" button (or Browser Back) to close UI elements.
 * 
 * @param isOpen Whether the UI element is currently open.
 * @param onClose Callback to close the UI element.
 * @param active Optional condition to enable the logic (e.g., only on mobile). Defaults to true.
 */
export const useBackButton = (isOpen: boolean, onClose: () => void, active: boolean = true) => {
    // Track if the close action was triggered by the history event (Back button)
    const isBackRef = useRef(false);

    useEffect(() => {
        if (isOpen && active) {
            // Reset flag
            isBackRef.current = false;
            
            // Push a dummy state to history so the back button has something to "pop"
            window.history.pushState({ modalOpen: true }, '');

            const handlePopState = (event: PopStateEvent) => {
                // The user pressed Back.
                // Mark that this close is coming from history navigation so we don't try to go back again.
                isBackRef.current = true;
                onClose();
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
                
                // If the cleanup is running and it wasn't triggered by the back button
                // (i.e., user clicked 'X' or backdrop), we must manually revert the history state
                // to keep the browser history clean.
                if (!isBackRef.current) {
                    window.history.back();
                }
            };
        }
    }, [isOpen, onClose, active]);
};
