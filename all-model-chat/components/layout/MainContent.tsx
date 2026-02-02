
import React from 'react';
import { HistorySidebar, HistorySidebarProps } from '../sidebar/HistorySidebar';
import { ChatArea, ChatAreaProps } from './ChatArea';
import { AppModals, AppModalsProps } from '../modals/AppModals';
import { SidePanel } from './SidePanel';
import { FolderExplorer } from '../sidebar/FolderExplorer';
import { SideViewContent, ProjectContext, ProjectContextReadState } from '../../types';

interface MainContentProps {
    sidebarProps: HistorySidebarProps;
    chatAreaProps: ChatAreaProps & {
        projectContext?: ProjectContext | null;
        projectContextReadState?: ProjectContextReadState;
        onClearProjectContext?: () => void;
    };
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
    const { projectContext, projectContextReadState, onClearProjectContext, t, ...restChatAreaProps } = chatAreaProps;

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

            {/* Agentic folder explorer sidebar */}
            {projectContext && onClearProjectContext && (
                <div className="hidden md:block w-64 flex-shrink-0 h-full">
                    <FolderExplorer
                        projectContext={projectContext}
                        readState={projectContextReadState}
                        onClearProject={onClearProjectContext}
                        t={t}
                        themeId={themeId}
                    />
                </div>
            )}

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