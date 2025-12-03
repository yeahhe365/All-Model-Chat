
import React from 'react';
import { HistorySidebar, HistorySidebarProps } from '../sidebar/HistorySidebar';
import { ChatArea, ChatAreaProps } from './ChatArea';
import { AppModals, AppModalsProps } from '../modals/AppModals';
import { SidePanel } from './SidePanel';
import { SideViewContent } from '../../types';

interface MainContentProps {
    sidebarProps: HistorySidebarProps;
    chatAreaProps: ChatAreaProps;
    appModalsProps: AppModalsProps;
    isHistorySidebarOpen: boolean;
    setIsHistorySidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
    sidePanelContent: SideViewContent | null;
    onCloseSidePanel: () => void;
    themeId: string;
}

export const MainContent: React.FC<MainContentProps> = ({
    sidebarProps,
    chatAreaProps,
    appModalsProps,
    isHistorySidebarOpen,
    setIsHistorySidebarOpen,
    sidePanelContent,
    onCloseSidePanel,
    themeId,
}) => {
    return (
        <>
            {isHistorySidebarOpen && (
                <div 
                    onClick={() => setIsHistorySidebarOpen(false)} 
                    className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 md:hidden"
                    aria-hidden="true"
                />
            )}
            <HistorySidebar {...sidebarProps} />
            <ChatArea {...chatAreaProps} />
            
            {sidePanelContent && (
                <SidePanel 
                    content={sidePanelContent} 
                    onClose={onCloseSidePanel}
                    themeId={themeId}
                />
            )}
            
            <AppModals {...appModalsProps} />
        </>
    );
};