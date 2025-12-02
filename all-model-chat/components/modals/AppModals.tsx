
import React from 'react';
import { SettingsModal } from '../settings/SettingsModal';
import { LogViewer } from '../log-viewer/LogViewer';
import { PreloadedMessagesModal } from '../scenarios/PreloadedMessagesModal';
import { ExportChatModal } from './ExportChatModal';
import { AVAILABLE_THEMES } from '../../constants/themeConstants';
import { AppSettings, ModelOption, ChatSettings, SavedScenario } from '../../types';
import { translations } from '../../utils/appUtils';

export interface AppModalsProps {
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (isOpen: boolean) => void;
  appSettings: AppSettings;
  availableModels: ModelOption[];
  handleSaveSettings: (newSettings: AppSettings) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  clearCacheAndReload: () => void;
  clearAllHistory: () => void;
  handleInstallPwa: () => void;
  installPromptEvent: any;
  isStandalone: boolean;

  handleImportSettings: (file: File) => void;
  handleExportSettings: () => void;
  handleImportHistory: (file: File) => void;
  handleExportHistory: () => void;
  handleImportAllScenarios: (file: File) => void;
  handleExportAllScenarios: () => void;

  isPreloadedMessagesModalOpen: boolean;
  setIsPreloadedMessagesModalOpen: (isOpen: boolean) => void;
  savedScenarios: SavedScenario[];
  handleSaveAllScenarios: (scenarios: SavedScenario[]) => void;
  handleLoadPreloadedScenario: (scenario: SavedScenario) => void;

  isExportModalOpen: boolean;
  setIsExportModalOpen: (isOpen: boolean) => void;
  handleExportChat: (format: 'png' | 'html' | 'txt' | 'json') => Promise<void>;
  exportStatus: 'idle' | 'exporting';

  isLogViewerOpen: boolean;
  setIsLogViewerOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  currentChatSettings: ChatSettings;

  t: (key: keyof typeof translations, fallback?: string) => string;
  setAvailableModels: (models: ModelOption[]) => void;
}

export const AppModals: React.FC<AppModalsProps> = (props) => {
    const {
        isSettingsModalOpen, setIsSettingsModalOpen, appSettings, availableModels,
        handleSaveSettings, isModelsLoading, modelsLoadingError, clearCacheAndReload,
        clearAllHistory,
        handleInstallPwa, installPromptEvent, isStandalone, 
        handleImportSettings, handleExportSettings,
        handleImportHistory, handleExportHistory,
        handleImportAllScenarios, handleExportAllScenarios,
        isPreloadedMessagesModalOpen, setIsPreloadedMessagesModalOpen, savedScenarios,
        handleSaveAllScenarios, handleLoadPreloadedScenario,
        isExportModalOpen, setIsExportModalOpen, handleExportChat, exportStatus,
        isLogViewerOpen, setIsLogViewerOpen, currentChatSettings,
        t, setAvailableModels
    } = props;
    
    return (
        <>
          {isLogViewerOpen && (
            <LogViewer
                isOpen={isLogViewerOpen}
                onClose={() => setIsLogViewerOpen(false)}
                appSettings={appSettings}
                currentChatSettings={currentChatSettings}
            />
          )}
          {isSettingsModalOpen && (
            <SettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
              currentSettings={appSettings}
              availableModels={availableModels}
              availableThemes={AVAILABLE_THEMES}
              onSave={handleSaveSettings}
              isModelsLoading={isModelsLoading}
              modelsLoadingError={modelsLoadingError}
              onClearAllHistory={clearAllHistory}
              onClearCache={clearCacheAndReload}
              onOpenLogViewer={() => setIsLogViewerOpen(true)}
              onInstallPwa={handleInstallPwa}
              isInstallable={!!installPromptEvent && !isStandalone}
              onImportSettings={handleImportSettings}
              onExportSettings={handleExportSettings}
              onImportHistory={handleImportHistory}
              onExportHistory={handleExportHistory}
              onImportScenarios={handleImportAllScenarios}
              onExportScenarios={handleExportAllScenarios}
              t={t}
              setAvailableModels={setAvailableModels}
            />
          )}
          {isPreloadedMessagesModalOpen && (
            <PreloadedMessagesModal
              isOpen={isPreloadedMessagesModalOpen}
              onClose={() => setIsPreloadedMessagesModalOpen(false)}
              savedScenarios={savedScenarios}
              onSaveAllScenarios={handleSaveAllScenarios}
              onLoadScenario={handleLoadPreloadedScenario}
              t={t}
            />
          )}
          {isExportModalOpen && (
              <ExportChatModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExportChat}
                exportStatus={exportStatus}
                t={t}
              />
          )}
        </>
    );
}
