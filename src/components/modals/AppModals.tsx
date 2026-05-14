import React, { Suspense, useState } from 'react';
import { type AppSettings, type ModelOption, type ChatSettings, type SavedScenario } from '@/types';
import type { LogViewerProps } from '@/components/log-viewer/LogViewer';
import type { PwaInstallState } from '@/pwa/install';
import { lazyNamedComponent } from '@/utils/lazyNamedComponent';

const LazySettingsModal = lazyNamedComponent(() => import('@/components/settings/SettingsModal'), 'SettingsModal');
const LazyLogViewer = lazyNamedComponent(() => import('@/components/log-viewer/LogViewer'), 'LogViewer');
const LazyPreloadedMessagesModal = lazyNamedComponent(
  () => import('@/components/scenarios/PreloadedMessagesModal'),
  'PreloadedMessagesModal',
);
const LazyExportChatModal = lazyNamedComponent(() => import('./ExportChatModal'), 'ExportChatModal');

interface AppModalsProps {
  isSettingsModalOpen?: boolean;
  setIsSettingsModalOpen?: (isOpen: boolean) => void;
  appSettings?: AppSettings;
  availableModels: ModelOption[];
  handleSaveSettings: (newSettings: AppSettings) => void;
  handleSaveCurrentChatSettings: (newSettings: ChatSettings) => void;
  clearCacheAndReload: () => void;
  clearAllHistory: () => void;
  handleInstallPwa: () => void;
  installState: PwaInstallState;

  handleImportAllScenarios: (file: File) => void;
  handleExportAllScenarios: () => void;

  isPreloadedMessagesModalOpen?: boolean;
  setIsPreloadedMessagesModalOpen?: (isOpen: boolean) => void;
  savedScenarios: SavedScenario[];
  handleSaveAllScenarios: (scenarios: SavedScenario[]) => void;
  handleLoadPreloadedScenario: (scenario: SavedScenario) => void;

  isExportModalOpen: boolean;
  setIsExportModalOpen: (isOpen: boolean) => void;
  handleExportChat: (format: 'png' | 'html' | 'txt' | 'json') => Promise<void>;
  exportStatus: 'idle' | 'exporting';

  isLogViewerOpen?: boolean;
  setIsLogViewerOpen?: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  currentChatSettings: ChatSettings;
  activeSessionId: string | null;

  setAvailableModels: (models: ModelOption[]) => void;
}

export const AppModals: React.FC<AppModalsProps> = (props) => {
  const [logViewerState, setLogViewerState] = useState<Pick<LogViewerProps, 'initialTab' | 'initialUsageTab'>>({
    initialTab: 'console',
    initialUsageTab: 'overview',
  });
  const {
    isSettingsModalOpen = false,
    setIsSettingsModalOpen = () => {},
    appSettings,
    availableModels,
    handleSaveSettings,
    handleSaveCurrentChatSettings,
    clearCacheAndReload,
    clearAllHistory,
    handleInstallPwa,
    installState,
    handleImportAllScenarios,
    handleExportAllScenarios,
    isPreloadedMessagesModalOpen = false,
    setIsPreloadedMessagesModalOpen = () => {},
    savedScenarios,
    handleSaveAllScenarios,
    handleLoadPreloadedScenario,
    isExportModalOpen,
    setIsExportModalOpen,
    handleExportChat,
    exportStatus,
    isLogViewerOpen = false,
    setIsLogViewerOpen = () => {},
    currentChatSettings,
    activeSessionId,
    setAvailableModels,
  } = props;

  const openLogViewer = (state?: Pick<LogViewerProps, 'initialTab' | 'initialUsageTab'>) => {
    setLogViewerState({
      initialTab: 'console',
      initialUsageTab: 'overview',
      ...state,
    });
    setIsLogViewerOpen(true);
  };

  return (
    <>
      {isLogViewerOpen && (
        <Suspense fallback={null}>
          <LazyLogViewer
            isOpen={isLogViewerOpen}
            onClose={() => {
              setIsLogViewerOpen(false);
              setLogViewerState({ initialTab: 'console', initialUsageTab: 'overview' });
            }}
            appSettings={appSettings!}
            currentChatSettings={currentChatSettings}
            initialTab={logViewerState.initialTab}
            initialUsageTab={logViewerState.initialUsageTab}
          />
        </Suspense>
      )}
      {isSettingsModalOpen && (
        <Suspense fallback={null}>
          <LazySettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            currentSettings={appSettings!}
            currentChatSettings={currentChatSettings}
            hasActiveSession={!!activeSessionId}
            availableModels={availableModels}
            onSave={handleSaveSettings}
            onSaveCurrentChatSettings={handleSaveCurrentChatSettings}
            onClearAllHistory={clearAllHistory}
            onClearCache={clearCacheAndReload}
            onOpenLogViewer={openLogViewer}
            onInstallPwa={handleInstallPwa}
            installState={installState}
            onImportScenarios={handleImportAllScenarios}
            onExportScenarios={handleExportAllScenarios}
            setAvailableModels={setAvailableModels}
          />
        </Suspense>
      )}
      {isPreloadedMessagesModalOpen && (
        <Suspense fallback={null}>
          <LazyPreloadedMessagesModal
            isOpen={isPreloadedMessagesModalOpen}
            onClose={() => setIsPreloadedMessagesModalOpen(false)}
            savedScenarios={savedScenarios}
            onSaveAllScenarios={handleSaveAllScenarios}
            onLoadScenario={handleLoadPreloadedScenario}
          />
        </Suspense>
      )}
      {isExportModalOpen && (
        <Suspense fallback={null}>
          <LazyExportChatModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onExport={handleExportChat}
            exportStatus={exportStatus}
          />
        </Suspense>
      )}
    </>
  );
};
