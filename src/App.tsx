
import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from './hooks/app/useApp';
import { WindowProvider } from './contexts/WindowContext';
import { I18nProvider } from './contexts/I18nContext';
import { MainContent } from './components/layout/MainContent';
import { PiPPlaceholder } from './components/layout/PiPPlaceholder';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { PwaUpdateBanner } from './components/pwa/PwaUpdateBanner';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const app = useApp();
  const {
    currentTheme,
    eventsState,
    pipState,
    uiState,
  } = app;

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
                        <MainContent app={app} />
                    </div>
                  </WindowProvider>,
                  pipState.pipContainer
              )}
              <PiPPlaceholder onClosePip={pipState.togglePip} />
          </>
      ) : (
              <WindowProvider>
            <MainContent app={app} />
          </WindowProvider>
      )}
      {eventsState.needRefresh && !eventsState.updateDismissed ? (
        <PwaUpdateBanner
          onRefresh={() => {
            void eventsState.handleRefreshApp();
          }}
          onDismiss={eventsState.dismissUpdateBanner}
        />
      ) : null}
    </div>
  );
};

export default App;
