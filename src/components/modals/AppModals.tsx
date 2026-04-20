
import React, { Suspense, lazy, useState } from 'react';
import { AppSettings, ModelOption, ChatSettings, SavedScenario } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import type { LogViewerProps } from '../log-viewer/LogViewer';
import type { PwaInstallState } from '../../pwa/install';
import type { ManualUpdateCheckState } from '../../pwa/register';

const LazySettingsModal = lazy(async () => {
    const module = await import('../settings/SettingsModal');
    return { default: module.SettingsModal };
});

const LazyLogViewer = lazy(async () => {
    const module = await import('../log-viewer/LogViewer');
    return { default: module.LogViewer };
});

const LazyPreloadedMessagesModal = lazy(async () => {
    const module = await import('../scenarios/PreloadedMessagesModal');
    return { default: module.PreloadedMessagesModal };
});

const LazyExportChatModal = lazy(async () => {
    const module = await import('./ExportChatModal');
    return { default: module.ExportChatModal };
});

interface AppModalsProps {
  isSettingsModalOpen?: boolean;
  setIsSettingsModalOpen?: (isOpen: boolean) => void;
  appSettings?: AppSettings;
  availableModels: ModelOption[];
  handleSaveSettings: (newSettings: AppSettings) => void;
  clearCacheAndReload: () => void;
  clearAllHistory: () => void;
  handleInstallPwa: () => void;
  installState: PwaInstallState;
  handleCheckForUpdates?: () => Promise<void> | void;
  canCheckForUpdates?: boolean;
  manualUpdateCheckState?: ManualUpdateCheckState;

  handleImportSettings: (file: File) => void;
  handleExportSettings: () => void;
  handleImportHistory: (file: File) => void;
  handleExportHistory: () => void;
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

  setAvailableModels: (models: ModelOption[]) => void;
}

export const AppModals: React.FC<AppModalsProps> = (props) => {
    const { t } = useI18n();
    const [logViewerState, setLogViewerState] = useState<Pick<LogViewerProps, 'initialTab' | 'initialUsageTab'>>({
      initialTab: 'console',
      initialUsageTab: 'overview',
    });
    const {
        isSettingsModalOpen = false,
        setIsSettingsModalOpen = () => {},
        appSettings,
        availableModels,
        handleSaveSettings, clearCacheAndReload,
        clearAllHistory,
        handleInstallPwa, installState,
        handleCheckForUpdates,
        canCheckForUpdates,
        manualUpdateCheckState = 'idle',
        handleImportSettings, handleExportSettings,
        handleImportHistory, handleExportHistory,
        handleImportAllScenarios, handleExportAllScenarios,
        isPreloadedMessagesModalOpen = false,
        setIsPreloadedMessagesModalOpen = () => {},
        savedScenarios,
        handleSaveAllScenarios, handleLoadPreloadedScenario,
        isExportModalOpen, setIsExportModalOpen, handleExportChat, exportStatus,
        isLogViewerOpen = false,
        setIsLogViewerOpen = () => {},
        currentChatSettings,
        setAvailableModels
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
                  availableModels={availableModels}
                  onSave={handleSaveSettings}
                  onClearAllHistory={clearAllHistory}
                  onClearCache={clearCacheAndReload}
                  onOpenLogViewer={openLogViewer}
                  onInstallPwa={handleInstallPwa}
                  installState={installState}
                  onCheckForUpdates={handleCheckForUpdates}
                  canCheckForUpdates={canCheckForUpdates}
                  manualUpdateCheckState={manualUpdateCheckState}
                  onImportSettings={handleImportSettings}
                  onExportSettings={handleExportSettings}
                  onImportHistory={handleImportHistory}
                  onExportHistory={handleExportHistory}
                  onImportScenarios={handleImportAllScenarios}
                  onExportScenarios={handleExportAllScenarios}
                  t={t}
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
                  t={t}
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
}
