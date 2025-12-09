
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppSettings, ModelOption } from '../../types';
import { X } from 'lucide-react';
import { DEFAULT_APP_SETTINGS, THINKING_BUDGET_RANGES } from '../../constants/appConstants';
import { Theme } from '../../constants/themeConstants';
import { translations, logService } from '../../utils/appUtils';
import { ApiConfigSection } from './ApiConfigSection';
import { AppearanceSection } from './AppearanceSection';
import { ChatBehaviorSection } from './ChatBehaviorSection';
import { DataManagementSection } from './DataManagementSection';
import { ShortcutsSection } from './ShortcutsSection';
import { AboutSection } from './AboutSection';
import { Modal } from '../shared/Modal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { IconInterface, IconModel, IconApiKey, IconData, IconAbout, IconKeyboard } from '../icons/CustomIcons';

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

type SettingsTab = 'interface' | 'model' | 'account' | 'data' | 'shortcuts' | 'about';

const SETTINGS_TAB_STORAGE_KEY = 'chatSettingsLastTab';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentSettings, availableModels, availableThemes, 
  onSave, onClearAllHistory, onClearCache, onOpenLogViewer,
  onInstallPwa, isInstallable, t, 
  onImportSettings, onExportSettings,
  onImportHistory, onExportHistory,
  onImportScenarios, onExportScenarios,
  setAvailableModels
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
      const validTabs: SettingsTab[] = ['interface', 'model', 'account', 'data', 'shortcuts', 'about'];
      if (saved && validTabs.includes(saved as SettingsTab)) {
        return saved as SettingsTab;
      }
    } catch (e) {
      // Ignore storage errors
    }
    return 'interface';
  });
  
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmLabel?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  if (!isOpen) return null;

  const handleClose = () => { onClose(); };
  
  const handleResetToDefaults = () => { 
    setConfirmConfig({
        isOpen: true,
        title: t('settingsReset'),
        message: t('settingsReset_confirm'),
        onConfirm: () => onSave(DEFAULT_APP_SETTINGS),
        isDanger: true,
        confirmLabel: t('settingsReset')
    });
  };
  
  const handleClearLogs = async () => {
      setConfirmConfig({
          isOpen: true,
          title: t('settingsClearLogs'),
          message: t('settingsClearLogs_confirm'),
          onConfirm: async () => { await logService.clearLogs(); },
          isDanger: true,
          confirmLabel: t('delete')
      });
  };
  
  const handleRequestClearHistory = () => {
      setConfirmConfig({
          isOpen: true,
          title: t('settingsClearHistory'),
          message: t('settingsClearHistory_confirm'),
          onConfirm: onClearAllHistory,
          isDanger: true,
          confirmLabel: t('delete')
      });
  };

  const handleRequestClearCache = () => {
      setConfirmConfig({
          isOpen: true,
          title: t('settingsClearCache'),
          message: t('settingsClearCache_confirm'),
          onConfirm: onClearCache,
          isDanger: true,
          confirmLabel: t('delete')
      });
  };

  const handleRequestImportHistory = (file: File) => {
      setConfirmConfig({
          isOpen: true,
          title: t('settingsImportHistory'),
          message: t('settingsImportHistory_confirm'),
          onConfirm: () => onImportHistory(file),
          isDanger: false,
          confirmLabel: t('import')
      });
  };
  
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSave({ ...currentSettings, [key]: value });
  };

  const handleModelChangeInSettings = (newModelId: string) => {
    const isThinkingModel = Object.keys(THINKING_BUDGET_RANGES).includes(newModelId);
    let newThinkingBudget;

    if (isThinkingModel) {
        newThinkingBudget = THINKING_BUDGET_RANGES[newModelId].max;
    } else {
        newThinkingBudget = DEFAULT_APP_SETTINGS.thinkingBudget;
    }
    
    onSave({
        ...currentSettings,
        modelId: newModelId,
        thinkingBudget: newThinkingBudget
    });
  };

  const tabs = useMemo(() => [
    { id: 'interface' as SettingsTab, labelKey: 'settingsTabInterface', icon: IconInterface },
    { id: 'model' as SettingsTab, labelKey: 'settingsTabModel', icon: IconModel },
    { id: 'account' as SettingsTab, labelKey: 'settingsTabAccount', icon: IconApiKey },
    { id: 'data' as SettingsTab, labelKey: 'settingsTabData', icon: IconData },
    { id: 'shortcuts' as SettingsTab, labelKey: 'settingsTabShortcuts', icon: IconKeyboard },
    { id: 'about' as SettingsTab, labelKey: 'settingsTabAbout', icon: IconAbout },
  ], []);

  const renderTabContent = () => {
      const animClass = "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both";
      
      return (
        <div className="max-w-3xl mx-auto w-full">
            {activeTab === 'interface' && (
                <div className={animClass}>
                    <AppearanceSection
                    themeId={currentSettings.themeId}
                    setThemeId={(val) => updateSetting('themeId', val)}
                    language={currentSettings.language}
                    setLanguage={(val) => updateSetting('language', val)}
                    isCompletionNotificationEnabled={currentSettings.isCompletionNotificationEnabled}
                    setIsCompletionNotificationEnabled={(val) => updateSetting('isCompletionNotificationEnabled', val)}
                    baseFontSize={currentSettings.baseFontSize}
                    setBaseFontSize={(val) => updateSetting('baseFontSize', val)}
                    expandCodeBlocksByDefault={currentSettings.expandCodeBlocksByDefault}
                    setExpandCodeBlocksByDefault={(v) => updateSetting('expandCodeBlocksByDefault', v)}
                    isMermaidRenderingEnabled={currentSettings.isMermaidRenderingEnabled}
                    setIsMermaidRenderingEnabled={(v) => updateSetting('isMermaidRenderingEnabled', v)}
                    isGraphvizRenderingEnabled={currentSettings.isGraphvizRenderingEnabled ?? true}
                    setIsGraphvizRenderingEnabled={(v) => updateSetting('isGraphvizRenderingEnabled', v)}
                    isAutoScrollOnSendEnabled={currentSettings.isAutoScrollOnSendEnabled ?? true}
                    setIsAutoScrollOnSendEnabled={(v) => updateSetting('isAutoScrollOnSendEnabled', v)}
                    isStreamingEnabled={currentSettings.isStreamingEnabled}
                    setIsStreamingEnabled={(v) => updateSetting('isStreamingEnabled', v)}
                    isAutoTitleEnabled={currentSettings.isAutoTitleEnabled}
                    setIsAutoTitleEnabled={(v) => updateSetting('isAutoTitleEnabled', v)}
                    isSuggestionsEnabled={currentSettings.isSuggestionsEnabled}
                    setIsSuggestionsEnabled={(v) => updateSetting('isSuggestionsEnabled', v)}
                    isAutoSendOnSuggestionClick={currentSettings.isAutoSendOnSuggestionClick ?? true}
                    setIsAutoSendOnSuggestionClick={(v) => updateSetting('isAutoSendOnSuggestionClick', v)}
                    autoFullscreenHtml={currentSettings.autoFullscreenHtml ?? true}
                    setAutoFullscreenHtml={(v) => updateSetting('autoFullscreenHtml', v)}
                    showWelcomeSuggestions={currentSettings.showWelcomeSuggestions ?? true}
                    setShowWelcomeSuggestions={(v) => updateSetting('showWelcomeSuggestions', v)}
                    filesApiConfig={currentSettings.filesApiConfig}
                    setFilesApiConfig={(v) => updateSetting('filesApiConfig', v)}
                    t={t}
                    />
                </div>
            )}
            {activeTab === 'model' && (
                <div className={`${animClass} max-w-4xl mx-auto`}>
                <ChatBehaviorSection
                    modelId={currentSettings.modelId} setModelId={handleModelChangeInSettings}
                    transcriptionModelId={currentSettings.transcriptionModelId} setTranscriptionModelId={(v) => updateSetting('transcriptionModelId', v)}
                    generateQuadImages={currentSettings.generateQuadImages ?? false} setGenerateQuadImages={(v) => updateSetting('generateQuadImages', v)}
                    ttsVoice={currentSettings.ttsVoice} setTtsVoice={(v) => updateSetting('ttsVoice', v)}
                    systemInstruction={currentSettings.systemInstruction} setSystemInstruction={(v) => updateSetting('systemInstruction', v)}
                    temperature={currentSettings.temperature} setTemperature={(v) => updateSetting('temperature', v)}
                    topP={currentSettings.topP} setTopP={(v) => updateSetting('topP', v)}
                    showThoughts={currentSettings.showThoughts} setShowThoughts={(v) => updateSetting('showThoughts', v)}
                    thinkingBudget={currentSettings.thinkingBudget} setThinkingBudget={(v) => updateSetting('thinkingBudget', v)}
                    thinkingLevel={currentSettings.thinkingLevel} setThinkingLevel={(v) => updateSetting('thinkingLevel', v)}
                    safetySettings={currentSettings.safetySettings} setSafetySettings={(v) => updateSetting('safetySettings', v)}
                    availableModels={availableModels}
                    t={t}
                    setAvailableModels={setAvailableModels}
                />
                </div>
            )}
            {activeTab === 'account' && (
                <div className={animClass}>
                <ApiConfigSection
                useCustomApiConfig={currentSettings.useCustomApiConfig}
                setUseCustomApiConfig={(val) => updateSetting('useCustomApiConfig', val)}
                apiKey={currentSettings.apiKey}
                setApiKey={(val) => updateSetting('apiKey', val)}
                apiProxyUrl={currentSettings.apiProxyUrl}
                setApiProxyUrl={(val) => updateSetting('apiProxyUrl', val)}
                useApiProxy={currentSettings.useApiProxy ?? false}
                setUseApiProxy={(val) => updateSetting('useApiProxy', val)}
                t={t}
                />
                </div>
            )}
            {activeTab === 'data' && (
                <div className={animClass}>
                <DataManagementSection
                    onClearHistory={handleRequestClearHistory}
                    onClearCache={handleRequestClearCache}
                    onOpenLogViewer={() => { onOpenLogViewer(); onClose(); }}
                    onClearLogs={handleClearLogs}
                    onInstallPwa={onInstallPwa}
                    isInstallable={isInstallable}
                    onImportSettings={onImportSettings}
                    onExportSettings={onExportSettings}
                    onImportHistory={handleRequestImportHistory}
                    onExportHistory={onExportHistory}
                    onImportScenarios={onImportScenarios}
                    onExportScenarios={onExportScenarios}
                    onReset={handleResetToDefaults}
                    t={t}
                />
                </div>
            )}
            {activeTab === 'shortcuts' && ( <div className={animClass}><ShortcutsSection t={t} /></div> )}
            {activeTab === 'about' && ( <div className={animClass}><AboutSection t={t} /></div> )}
        </div>
      );
  }

  return (
    <>
        <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        noPadding 
        contentClassName="w-full h-[100dvh] sm:h-[85vh] max-h-[800px] sm:w-[90vw] max-w-6xl sm:rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl bg-[var(--theme-bg-primary)] transition-all"
        >
        {/* Sidebar */}
        <aside className="flex-shrink-0 w-full md:w-64 bg-[var(--theme-bg-secondary)] border-b md:border-b-0 md:border-r border-[var(--theme-border-primary)] flex flex-col">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-5 flex-shrink-0">
                <button 
                    ref={closeButtonRef}
                    onClick={handleClose} 
                    className="p-2 rounded-md hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                    aria-label={t('close')}
                >
                    <X size={20} strokeWidth={2} />
                </button>
                {/* Mobile Title */}
                <span className="md:hidden font-semibold text-[var(--theme-text-primary)]">{t('settingsTitle')}</span>
                <div className="w-8 md:hidden"></div>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden custom-scrollbar px-2 pb-2 md:px-3 md:pb-3 flex md:flex-col gap-1 md:gap-1.5" role="tablist">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 text-sm font-medium rounded-lg transition-all outline-none select-none w-auto md:w-full text-left
                            ${isActive
                                ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]' 
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                            }
                            focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)]
                            `}
                            role="tab"
                            aria-selected={isActive}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className={isActive ? "text-[var(--theme-text-primary)]" : "text-[var(--theme-text-tertiary)]"} />
                            <span>{t(tab.labelKey as any)}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-primary)] relative overflow-hidden">
            {/* Desktop Header */}
            <header className="hidden md:flex items-center px-8 py-6 flex-shrink-0">
                <h2 className="text-2xl font-bold text-[var(--theme-text-primary)] tracking-tight">
                    {t(tabs.find(t => t.id === activeTab)?.labelKey as any)}
                </h2>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8">
                {renderTabContent()}
            </div>
        </main>
        </Modal>

        {confirmConfig.isOpen && (
            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
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
