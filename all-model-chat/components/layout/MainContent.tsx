import React from 'react';
import { HistorySidebar, HistorySidebarProps } from '../sidebar/HistorySidebar';
import { ChatArea, ChatAreaProps } from './ChatArea';
import { AppModals, AppModalsProps } from '../modals/AppModals';

interface MainContentProps {
    sidebarProps: HistorySidebarProps;
    chatAreaProps: ChatAreaProps;
    appModalsProps: AppModalsProps;
    isHistorySidebarOpen: boolean;
    setIsHistorySidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
}

export const MainContent: React.FC<MainContentProps> = ({
    sidebarProps,
    chatAreaProps,
    appModalsProps,
    isHistorySidebarOpen,
    setIsHistorySidebarOpen,
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
            <AppModals {...appModalsProps} />
        </>
    );
};