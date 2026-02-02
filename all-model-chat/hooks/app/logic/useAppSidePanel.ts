
import { useState, useCallback } from 'react';
import { SideViewContent } from '../../../types';

export const useAppSidePanel = (setIsHistorySidebarOpen: (isOpen: boolean) => void) => {
    const [sidePanelContent, setSidePanelContent] = useState<SideViewContent | null>(null);
  
    const handleOpenSidePanel = useCallback((content: SideViewContent) => {
        setSidePanelContent(content);
        // Auto-collapse sidebar on smaller screens if opening side panel to save space
        if (window.innerWidth < 1280) {
            setIsHistorySidebarOpen(false);
        }
    }, [setIsHistorySidebarOpen]);

    const handleCloseSidePanel = useCallback(() => {
        setSidePanelContent(null);
    }, []);

    return { sidePanelContent, handleOpenSidePanel, handleCloseSidePanel };
};
