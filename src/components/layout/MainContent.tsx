import React, { Suspense, lazy } from 'react';
import { HistorySidebar } from '@/components/sidebar/HistorySidebar';
import { ChatArea } from './ChatArea';
import { AppModals } from '@/components/modals/AppModals';
import type { AppViewModel } from '@/hooks/app/useApp';
import { useMainContentViewModel } from './useMainContentViewModel';
import { ChatRuntimeProvider } from './chat-runtime/ChatRuntimeContext';

const LazySidePanel = lazy(async () => {
  const module = await import('./SidePanel');
  return { default: module.SidePanel };
});

interface MainContentProps {
  app: AppViewModel;
}

export const MainContent: React.FC<MainContentProps> = ({ app }) => {
  const {
    sidebarProps,
    appModalsProps,
    sidePanelContent,
    handleCloseSidePanel,
    sidePanelKey,
    overlayVisible,
    currentThemeId,
    closeHistorySidebar,
  } = useMainContentViewModel({ app });

  return (
    <>
      <div
        onClick={closeHistorySidebar}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden ${
          overlayVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      <HistorySidebar {...sidebarProps} />
      <ChatRuntimeProvider app={app}>
        <ChatArea />
      </ChatRuntimeProvider>

      {sidePanelContent && (
        <Suspense fallback={null}>
          <LazySidePanel
            key={sidePanelKey}
            content={sidePanelContent}
            onClose={handleCloseSidePanel}
            themeId={currentThemeId}
          />
        </Suspense>
      )}

      <AppModals {...appModalsProps} />
    </>
  );
};
