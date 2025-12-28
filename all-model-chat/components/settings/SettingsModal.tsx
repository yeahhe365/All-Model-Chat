
import React from 'react';
import { AppSettings, ModelOption } from '../../types';
import { Theme } from '../../constants/themeConstants';
import { translations } from '../../utils/appUtils';
import { Modal } from '../shared/Modal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useSettingsLogic } from '../../hooks/features/useSettingsLogic';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsContent } from './SettingsContent';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings; 
  availableModels: ModelOption[];
  availableThemes: Theme[]; 
  onSave: (newSettings: AppSettings) => void; 
  onClearAllHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: () => void;
  onInstallPwa: () => void;
  isInstallable: boolean;
  onImportSettings: (file: File) => void;
  onExportSettings: () => void;
  onImportHistory: (file: File) => void;
  onExportHistory: () => void;
  onImportScenarios: (file: File) => void;
  onExportScenarios: () => void;
  t: (key: keyof typeof translations) => string;
  setAvailableModels: (models: ModelOption[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentSettings, availableModels, availableThemes, 
  onSave, onClearAllHistory, onClearCache, onOpenLogViewer,
  onInstallPwa, isInstallable, t, 
  onImportSettings, onExportSettings,
  onImportHistory, onExportHistory,
  onImportScenarios, onExportScenarios,
  setAvailableModels
}) => {
  
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
      onClose,
      currentSettings,
      onSave,
      onClearAllHistory,
      onClearCache,
      onOpenLogViewer,
      onImportHistory,
      t
  });

  if (!isOpen) return null;

  return (
    <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            noPadding 
            contentClassName="w-full h-[100dvh] sm:h-[85vh] max-h-[800px] sm:w-[90vw] max-w-6xl sm:rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl bg-[var(--theme-bg-primary)] transition-all"
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
                {/* Desktop Header */}
                <header className="hidden md:flex items-center px-8 py-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-[var(--theme-text-primary)] tracking-tight">
                        {t(tabs.find(t => t.id === activeTab)?.labelKey as any)}
                    </h2>
                </header>

                {/* Scrollable Content */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleContentScroll}
                    className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8"
                >
                    <SettingsContent
                        activeTab={activeTab}
                        currentSettings={currentSettings}
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
                        isInstallable={isInstallable}
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
