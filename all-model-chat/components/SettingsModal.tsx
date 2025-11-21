
import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { X } from 'lucide-react';
import { DEFAULT_APP_SETTINGS, THINKING_BUDGET_RANGES } from '../constants/appConstants';
import { Theme } from '../constants/themeConstants';
import { translations, getResponsiveValue } from '../utils/appUtils';
import { ApiConfigSection } from './settings/ApiConfigSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { ChatBehaviorSection } from './settings/ChatBehaviorSection';
import { DataManagementSection } from './settings/DataManagementSection';
import { AboutSection } from './settings/AboutSection';
import { ModelOption } from '../types';
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentSettings, availableModels, availableThemes, 
  onSave, isModelsLoading, modelsLoadingError, onClearAllHistory, onClearCache, onOpenLogViewer,
  onInstallPwa, isInstallable, t, 
  onImportSettings, onExportSettings,
  onImportHistory, onExportHistory,
  onImportScenarios, onExportScenarios,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('interface');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  const tabIconSize = getResponsiveValue(20, 22); // Slightly larger for custom icons to look good

  useEffect(() => {
    if (isOpen) {
      setActiveTab('interface');
      // Focus management or other init logic if needed
    }
  }, [isOpen]);

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

  const tabs: { id: SettingsTab; labelKey: keyof typeof translations; icon: React.ReactNode }[] = [
    { id: 'interface', labelKey: 'settingsTabInterface', icon: <IconInterface size={tabIconSize} strokeWidth={1.5} /> },
    { id: 'model', labelKey: 'settingsTabModel', icon: <IconModel size={tabIconSize} strokeWidth={1.5} /> },
    { id: 'account', labelKey: 'settingsTabAccount', icon: <IconApiKey size={tabIconSize} strokeWidth={1.5} /> },
    { id: 'data', labelKey: 'settingsTabData', icon: <IconData size={tabIconSize} strokeWidth={1.5} /> },
    { id: 'about', labelKey: 'settingsTabAbout', icon: <IconAbout size={tabIconSize} strokeWidth={1.5} /> },
  ];

  const currentTabLabel = tabs.find(t => t.id === activeTab)?.labelKey;

  const renderTabContent = () => (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 sm:pt-2">
          {activeTab === 'interface' && (
            <div className="animate-in fade-in duration-200">
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
             <div className="animate-in fade-in duration-200">
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
            <div className="animate-in fade-in duration-200">
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
             <div className="animate-in fade-in duration-200">
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
          {activeTab === 'about' && ( <div className="animate-in fade-in duration-200"><AboutSection t={t} /></div> )}
      </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} noPadding contentClassName="w-full h-full sm:w-[60rem] sm:h-[40rem] sm:rounded-2xl sm:overflow-hidden flex flex-col sm:flex-row sm:shadow-2xl transition-all">
      {/* Sidebar (Desktop) */}
      <div className="hidden sm:flex w-64 bg-[var(--theme-bg-secondary)] flex-col border-r border-[var(--theme-border-primary)] transition-colors">
        <div className="p-6 pb-4">
            <button 
                ref={closeButtonRef}
                onClick={handleClose} 
                className="p-2 rounded-full hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                aria-label={t('close')}
            >
                <X size={24} strokeWidth={1.5} />
            </button>
        </div>
        <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar space-y-1" role="tablist">
            {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]
                ${activeTab === tab.id
                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-semibold shadow-sm'
                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                }
                `}
                role="tab"
                aria-selected={activeTab === tab.id}
            >
                <span className={activeTab === tab.id ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-tertiary)]'}>
                {tab.icon}
                </span>
                <span>{t(tab.labelKey)}</span>
            </button>
            ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[var(--theme-bg-primary)] flex flex-col min-w-0 transition-colors h-full sm:h-auto">
        {/* Mobile Header */}
        <div className="sm:hidden flex items-center justify-between p-4 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
             <span className="font-semibold text-[var(--theme-text-primary)]">{t('settingsTitle')}</span>
             <button onClick={handleClose} className="p-1 rounded-full hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]"><X size={20} /></button>
        </div>
        
        {/* Mobile Tabs */}
        <div className="sm:hidden border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] px-2">
            <nav className="flex space-x-1 overflow-x-auto custom-scrollbar -mb-px" role="tablist">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none
                        ${activeTab === tab.id
                            ? 'border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]'
                            : 'border-transparent text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
                        }
                        `}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                    >
                        {tab.icon}
                        <span>{t(tab.labelKey)}</span>
                    </button>
                ))}
            </nav>
        </div>

        {/* Desktop Content Header */}
        <div className="hidden sm:block p-6 pb-2">
             <h2 className="text-2xl font-bold text-[var(--theme-text-primary)]">{currentTabLabel ? t(currentTabLabel) : ''}</h2>
        </div>

        {/* Content Body */}
        {renderTabContent()}
      </div>
    </Modal>
  );
};
