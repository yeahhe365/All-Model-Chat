
import React from 'react';
import { createPortal } from 'react-dom';
import { useAppLogic } from './hooks/app/useAppLogic';
import { useAppProps } from './hooks/app/useAppProps';
import { WindowProvider } from './contexts/WindowContext';
import { MainContent } from './components/layout/MainContent';
import { PiPPlaceholder } from './components/layout/PiPPlaceholder';

const App: React.FC = () => {
  const logic = useAppLogic();
  const { 
    currentTheme, 
    pipState, 
    chatState, 
    sidePanelContent, 
    handleCloseSidePanel, 
    uiState, 
  } = logic;

  const { sidebarProps, chatAreaProps, appModalsProps } = useAppProps(logic);

  return (
    <div 
      className={`relative flex h-full bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] theme-${currentTheme.id} overflow-hidden`}
      onTouchStart={uiState.handleTouchStart}
      onTouchEnd={uiState.handleTouchEnd}
    >
      {pipState.isPipActive && pipState.pipContainer && pipState.pipWindow ? (
          <>
              {createPortal(
                  <WindowProvider window={pipState.pipWindow} document={pipState.pipWindow.document}>
                    <div 
                        className={`theme-${currentTheme.id} h-full w-full flex relative bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]`}
                        onTouchStart={uiState.handleTouchStart}
                        onTouchEnd={uiState.handleTouchEnd}
                    >
                        <MainContent
                            sidebarProps={sidebarProps}
                            chatAreaProps={chatAreaProps}
                            appModalsProps={appModalsProps}
                            isHistorySidebarOpen={uiState.isHistorySidebarOpen}
                            setIsHistorySidebarOpen={uiState.setIsHistorySidebarOpen}
                            sidePanelContent={sidePanelContent}
                            onCloseSidePanel={handleCloseSidePanel}
                            themeId={currentTheme.id}
                        />
                    </div>
                  </WindowProvider>,
                  pipState.pipContainer
              )}
              <PiPPlaceholder onClosePip={pipState.togglePip} />
          </>
      ) : (
          <WindowProvider>
            <MainContent
                sidebarProps={sidebarProps}
                chatAreaProps={chatAreaProps}
                appModalsProps={appModalsProps}
                isHistorySidebarOpen={uiState.isHistorySidebarOpen}
                setIsHistorySidebarOpen={uiState.setIsHistorySidebarOpen}
                sidePanelContent={sidePanelContent}
                onCloseSidePanel={handleCloseSidePanel}
                themeId={currentTheme.id}
            />
          </WindowProvider>
      )}
    </div>
  );
};

export default App;