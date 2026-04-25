
import React, { useState } from 'react';
import { AppSettings, ModelOption } from '../../types';
import { Modal } from '../shared/Modal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useSettingsLogic } from '../../hooks/features/useSettingsLogic';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsContent } from './SettingsContent';
import { SettingsTransferProps } from './settingsTypes';
import type { LogViewerProps } from '../log-viewer/LogViewer';

interface SettingsModalProps extends SettingsTransferProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings; 
  availableModels: ModelOption[];
  onSave: (newSettings: AppSettings) => void; 
  onClearAllHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: (state?: Pick<LogViewerProps, 'initialTab' | 'initialUsageTab'>) => void;
  setAvailableModels: (models: ModelOption[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentSettings, availableModels,
  onSave, onClearAllHistory, onClearCache, onOpenLogViewer,
  onInstallPwa, installState, t, 
  onImportSettings, onExportSettings,
  onImportHistory, onExportHistory,
  onImportScenarios, onExportScenarios,
  setAvailableModels
}) => {
  const [liveSettings, setLiveSettings] = useState(currentSettings);
  
  const {
      activeTab,
      setActiveTab,
      confirmConfig,
      closeConfirm,
      scrollContainerRef,
      handleContentScroll,
      handleResetToDefaults,
      handleClearLogs,
      handleRequestClearHistory,
      handleRequestClearCache,
      handleRequestImportHistory,
      updateSetting,
      handleModelChange,
      tabs
  } = useSettingsLogic({
      isOpen,
      currentSettings: liveSettings,
      onSave: (nextSettings) => {
        setLiveSettings(nextSettings);
        onSave(nextSettings);
      },
      onClearAllHistory,
      onClearCache,
      onImportHistory,
      t
  });

  const activeTabLabelKey = tabs.find((tab) => tab.id === activeTab)?.labelKey;

  if (!isOpen) return null;

  return (
    <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            noPadding 
            enterAnimationClassName=""
            contentClassName="w-full h-[100dvh] sm:h-[85vh] sm:max-h-[800px] sm:w-[90vw] max-w-6xl sm:rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl bg-[var(--theme-bg-primary)] transition-all"
        >
            <SettingsSidebar 
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={onClose}
                t={t}
            />

            {/* Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-primary)] relative overflow-hidden">
                {/* Scrollable Content */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleContentScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8"
                >
                    <div className="hidden md:block max-w-3xl mx-auto w-full pb-4 md:pb-6">
                        <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">
                            {activeTabLabelKey ? t(activeTabLabelKey) : ''}
                        </h2>
                    </div>
                    <SettingsContent
                        activeTab={activeTab}
                        currentSettings={liveSettings}
                        availableModels={availableModels}
                        updateSetting={updateSetting}
                        handleModelChange={handleModelChange}
                        setAvailableModels={setAvailableModels}
                        onClearHistory={handleRequestClearHistory}
                        onClearCache={handleRequestClearCache}
                        onOpenLogViewer={() => { onOpenLogViewer(); onClose(); }}
                        onClearLogs={handleClearLogs}
                        onReset={handleResetToDefaults}
                        onInstallPwa={onInstallPwa}
                        installState={installState}
                        onImportSettings={onImportSettings}
                        onExportSettings={onExportSettings}
                        onImportHistory={handleRequestImportHistory}
                        onExportHistory={onExportHistory}
                        onImportScenarios={onImportScenarios}
                        onExportScenarios={onExportScenarios}
                        t={t}
                    />
                </div>
            </main>
        </Modal>

        {confirmConfig.isOpen && (
            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDanger={confirmConfig.isDanger}
                confirmLabel={confirmConfig.confirmLabel}
                cancelLabel={t('cancel')}
            />
        )}
    </>
  );
};
