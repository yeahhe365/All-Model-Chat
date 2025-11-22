
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppSettings, ModelOption } from '../types';
import { X, ChevronRight } from 'lucide-react';
import { DEFAULT_APP_SETTINGS, THINKING_BUDGET_RANGES } from '../constants/appConstants';
import { Theme } from '../constants/themeConstants';
import { translations, getResponsiveValue } from '../utils/appUtils';
import { ApiConfigSection } from './settings/ApiConfigSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { ChatBehaviorSection } from './settings/ChatBehaviorSection';
import { DataManagementSection } from './settings/DataManagementSection';
import { AboutSection } from './settings/AboutSection';
import { Modal } from './shared/Modal';
import { IconInterface, IconModel, IconApiKey, IconData, IconAbout } from './icons/CustomIcons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings; 
  availableModels: ModelOption[];
  availableThemes: Theme[]; 
  onSave: (newSettings: AppSettings) => void; 
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
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
}

type SettingsTab = 'interface' | 'model' | 'account' | 'data' | 'about';

const SETTINGS_TAB_STORAGE_KEY = 'chatSettingsLastTab';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentSettings, availableModels, availableThemes, 
  onSave, isModelsLoading, modelsLoadingError, onClearAllHistory, onClearCache, onOpenLogViewer,
  onInstallPwa, isInstallable, t, 
  onImportSettings, onExportSettings,
  onImportHistory, onExportHistory,
  onImportScenarios, onExportScenarios,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
      const validTabs: SettingsTab[] = ['interface', 'model', 'account', 'data', 'about'];
      if (saved && validTabs.includes(saved as SettingsTab)) {
        return saved as SettingsTab;
      }
    } catch (e) {
      // Ignore storage errors
    }
    return 'interface';
  });
  
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const tabIconSize = getResponsiveValue(18, 18);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  if (!isOpen) return null;

  const handleClose = () => { onClose(); };
  
  const handleResetToDefaults = () => { 
    if (window.confirm(t('settingsReset_confirm'))) {
      onSave(DEFAULT_APP_SETTINGS); 
    }
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
    { id: 'about' as SettingsTab, labelKey: 'settingsTabAbout', icon: IconAbout },
  ], []);

  const currentTabLabel = tabs.find(t => t.id === activeTab)?.labelKey;

  const renderTabContent = () => (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-8">
          {activeTab === 'interface' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  t={t}
                />
            </div>
          )}
          {activeTab === 'model' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <ChatBehaviorSection
                modelId={currentSettings.modelId} setModelId={handleModelChangeInSettings}
                transcriptionModelId={currentSettings.transcriptionModelId} setTranscriptionModelId={(v) => updateSetting('transcriptionModelId', v)}
                isTranscriptionThinkingEnabled={currentSettings.isTranscriptionThinkingEnabled} setIsTranscriptionThinkingEnabled={(v) => updateSetting('isTranscriptionThinkingEnabled', v)}
                useFilesApiForImages={currentSettings.useFilesApiForImages} setUseFilesApiForImages={(v) => updateSetting('useFilesApiForImages', v)}
                generateQuadImages={currentSettings.generateQuadImages ?? false} setGenerateQuadImages={(v) => updateSetting('generateQuadImages', v)}
                ttsVoice={currentSettings.ttsVoice} setTtsVoice={(v) => updateSetting('ttsVoice', v)}
                systemInstruction={currentSettings.systemInstruction} setSystemInstruction={(v) => updateSetting('systemInstruction', v)}
                temperature={currentSettings.temperature} setTemperature={(v) => updateSetting('temperature', v)}
                topP={currentSettings.topP} setTopP={(v) => updateSetting('topP', v)}
                showThoughts={currentSettings.showThoughts} setShowThoughts={(v) => updateSetting('showThoughts', v)}
                thinkingBudget={currentSettings.thinkingBudget} setThinkingBudget={(v) => updateSetting('thinkingBudget', v)}
                thinkingLevel={currentSettings.thinkingLevel} setThinkingLevel={(v) => updateSetting('thinkingLevel', v)}
                isModelsLoading={isModelsLoading}
                modelsLoadingError={modelsLoadingError}
                availableModels={availableModels}
                transcriptionLanguage={currentSettings.transcriptionLanguage}
                setTranscriptionLanguage={(v) => updateSetting('transcriptionLanguage', v)}
                enableItn={currentSettings.enableItn}
                setEnableItn={(v) => updateSetting('enableItn', v)}
                transcriptionContext={currentSettings.transcriptionContext}
                setTranscriptionContext={(v) => updateSetting('transcriptionContext', v)}
                t={t}
            />
            </div>
          )}
          {activeTab === 'account' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <DataManagementSection
                onClearHistory={onClearAllHistory}
                onClearCache={onClearCache}
                onOpenLogViewer={() => { onOpenLogViewer(); onClose(); }}
                onInstallPwa={onInstallPwa}
                isInstallable={isInstallable}
                onImportSettings={onImportSettings}
                onExportSettings={onExportSettings}
                onImportHistory={onImportHistory}
                onExportHistory={onExportHistory}
                onImportScenarios={onImportScenarios}
                onExportScenarios={onExportScenarios}
                onReset={handleResetToDefaults}
                t={t}
              />
              </div>
          )}
          {activeTab === 'about' && ( <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><AboutSection t={t} /></div> )}
      </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      noPadding 
      contentClassName="w-full h-[100dvh] sm:h-[85vh] max-h-[900px] sm:w-[95vw] md:w-[90vw] max-w-5xl sm:rounded-2xl overflow-hidden flex flex-col sm:flex-row shadow-2xl bg-[var(--theme-bg-primary)] transition-all"
    >
      {/* Sidebar (Desktop) */}
      <div className="hidden sm:flex w-64 md:w-72 bg-[var(--theme-bg-secondary)] flex-col border-r border-[var(--theme-border-primary)] flex-shrink-0">
        <div className="p-6 pb-4">
            <h2 className="text-xl font-bold text-[var(--theme-text-primary)] tracking-tight px-2">
              {t('settingsTitle')}
            </h2>
        </div>
        <nav className="flex-1 px-3 py-2 overflow-y-auto custom-scrollbar space-y-1" role="tablist">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group outline-none
                    ${isActive
                        ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]'
                        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/60 hover:text-[var(--theme-text-primary)]'
                    }
                    `}
                    role="tab"
                    aria-selected={isActive}
                >
                    <div className="flex items-center gap-3">
                        <span className={`transition-colors ${isActive ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-tertiary)] group-hover:text-[var(--theme-text-secondary)]'}`}>
                            <Icon size={tabIconSize} strokeWidth={isActive ? 2 : 1.5} />
                        </span>
                        <span>{t(tab.labelKey as any)}</span>
                    </div>
                    {isActive && <ChevronRight size={14} className="text-[var(--theme-text-tertiary)] opacity-50" />}
                </button>
              );
            })}
        </nav>
        <div className="p-4 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]/50">
             <p className="text-xs text-[var(--theme-text-tertiary)] text-center">
               All Model Chat v1.7.2
             </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-primary)] relative">
        {/* Mobile Header */}
        <div className="sm:hidden flex items-center justify-between p-4 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] sticky top-0 z-10">
             <span className="font-semibold text-lg text-[var(--theme-text-primary)]">{t('settingsTitle')}</span>
             <button 
                onClick={handleClose} 
                className="p-2 rounded-full hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] transition-colors"
             >
                <X size={20} />
             </button>
        </div>
        
        {/* Mobile Tabs (Horizontal Scroll) */}
        <div className="sm:hidden bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-primary)] shadow-sm sticky top-[60px] z-10">
            <nav className="flex overflow-x-auto custom-scrollbar px-2 py-2 gap-2" role="tablist">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap
                            ${isActive
                                ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] shadow-md'
                                : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)]'
                            }
                            `}
                            role="tab"
                            aria-selected={isActive}
                        >
                            <Icon size={16} strokeWidth={2} />
                            <span>{t(tab.labelKey as any)}</span>
                        </button>
                    );
                })}
            </nav>
        </div>

        {/* Desktop Header & Close Button */}
        <div className="hidden sm:flex items-center justify-between p-6 pb-2 md:p-8 md:pb-4">
             <div>
                 <h2 className="text-2xl font-bold text-[var(--theme-text-primary)] tracking-tight">
                    {currentTabLabel ? t(currentTabLabel as any) : ''}
                 </h2>
             </div>
             <button 
                ref={closeButtonRef}
                onClick={handleClose} 
                className="p-2 rounded-full hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                aria-label={t('close')}
            >
                <X size={24} strokeWidth={1.5} />
            </button>
        </div>

        {/* Content Body */}
        {renderTabContent()}
      </div>
    </Modal>
  );
};
