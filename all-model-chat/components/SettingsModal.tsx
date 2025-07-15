import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { Settings2, X, SlidersHorizontal, KeyRound, Bot } from 'lucide-react';
import { DEFAULT_APP_SETTINGS } from '../constants/appConstants';
import { Theme } from '../constants/themeConstants';
import { translations, getResponsiveValue } from '../utils/appUtils';
import { ApiConfigSection } from './settings/ApiConfigSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { ChatBehaviorSection } from './settings/ChatBehaviorSection';
import { DataManagementSection } from './settings/DataManagementSection';
import { SettingsActions } from './settings/SettingsActions';
import { ModelOption } from '../types';
import { Modal } from './shared/Modal';

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
  t: (key: keyof typeof translations) => string;
}

type SettingsTab = 'general' | 'api' | 'model';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentSettings, availableModels, availableThemes, 
  onSave, isModelsLoading, modelsLoadingError, onClearAllHistory, onClearCache, onOpenLogViewer, t
}) => {
  const [settings, setSettings] = useState(currentSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  const headingIconSize = getResponsiveValue(18, 20);
  const tabIconSize = getResponsiveValue(16, 18);

  useEffect(() => {
    if (isOpen) {
      setSettings(currentSettings);
      setActiveTab('general');
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleClose = () => { if (isOpen) onClose(); };
  const handleSave = () => { onSave(settings); };
  const handleResetToDefaults = () => { setSettings(DEFAULT_APP_SETTINGS); };
  
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <SlidersHorizontal size={tabIconSize} /> },
    { id: 'api', label: 'API', icon: <KeyRound size={tabIconSize} /> },
    { id: 'model', label: 'Model', icon: <Bot size={tabIconSize} /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div 
        className="bg-[var(--theme-bg-primary)] rounded-xl shadow-premium w-full max-w-md sm:max-w-3xl flex flex-col max-h-[90vh] sm:h-[85vh] sm:max-h-[750px]"
        role="document"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-3 sm:p-4 border-b border-[var(--theme-border-primary)]">
          <h2 id="settings-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
             <Settings2 size={headingIconSize + 2} className="mr-2.5 opacity-80" /> {t('settingsTitle')}
          </h2>
          <button ref={closeButtonRef} onClick={handleClose} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors p-1 rounded-full" aria-label="Close settings">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-grow min-h-0">
          {/* Nav */}
          <nav className="flex-shrink-0 w-full sm:w-48 bg-[var(--theme-bg-secondary)] sm:border-r border-b sm:border-b-0 border-[var(--theme-border-primary)] flex sm:flex-col p-2 sm:p-3 sm:space-y-1 overflow-x-auto sm:overflow-x-visible">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`settings-nav-button w-full flex-shrink-0 sm:flex-shrink-1 flex items-center justify-start gap-3 px-3 py-2.5 text-sm font-medium rounded-md ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          
          {/* Content Panel */}
          <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar">
            <div className="p-3 sm:p-5 tab-content-enter-active">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <AppearanceSection
                    themeId={settings.themeId}
                    setThemeId={(val) => updateSetting('themeId', val)}
                    availableThemes={availableThemes}
                    baseFontSize={settings.baseFontSize}
                    setBaseFontSize={(val) => updateSetting('baseFontSize', val)}
                    language={settings.language}
                    setLanguage={(val) => updateSetting('language', val)}
                    t={t}
                  />
                  <DataManagementSection
                    onClearHistory={() => { onClearAllHistory(); onClose(); }}
                    onClearCache={onClearCache}
                    onOpenLogViewer={onOpenLogViewer}
                    t={t}
                  />
                </div>
              )}
              {activeTab === 'api' && (
                <ApiConfigSection
                  useCustomApiConfig={settings.useCustomApiConfig}
                  setUseCustomApiConfig={(val) => updateSetting('useCustomApiConfig', val)}
                  apiKey={settings.apiKey}
                  setApiKey={(val) => updateSetting('apiKey', val)}
                  apiProxyUrl={settings.apiProxyUrl}
                  setApiProxyUrl={(val) => updateSetting('apiProxyUrl', val)}
                  t={t}
                />
              )}
              {activeTab === 'model' && (
                <ChatBehaviorSection
                  modelId={settings.modelId}
                  setModelId={(val) => updateSetting('modelId', val)}
                  isModelsLoading={isModelsLoading}
                  modelsLoadingError={modelsLoadingError}
                  availableModels={availableModels}
                  transcriptionModelId={settings.transcriptionModelId}
                  setTranscriptionModelId={(val) => updateSetting('transcriptionModelId', val)}
                  ttsVoice={settings.ttsVoice}
                  setTtsVoice={(val) => updateSetting('ttsVoice', val)}
                  systemInstruction={settings.systemInstruction}
                  setSystemInstruction={(val) => updateSetting('systemInstruction', val)}
                  temperature={settings.temperature}
                  setTemperature={(val) => updateSetting('temperature', val)}
                  topP={settings.topP}
                  setTopP={(val) => updateSetting('topP', val)}
                  showThoughts={settings.showThoughts}
                  setShowThoughts={(val) => updateSetting('showThoughts', val)}
                  thinkingBudget={settings.thinkingBudget}
                  setThinkingBudget={(val) => updateSetting('thinkingBudget', val)}
                  isStreamingEnabled={settings.isStreamingEnabled}
                  setIsStreamingEnabled={(val) => updateSetting('isStreamingEnabled', val)}
                  isTranscriptionThinkingEnabled={settings.isTranscriptionThinkingEnabled}
                  setIsTranscriptionThinkingEnabled={(val) => updateSetting('isTranscriptionThinkingEnabled', val)}
                  useFilesApiForImages={settings.useFilesApiForImages}
                  setUseFilesApiForImages={(val) => updateSetting('useFilesApiForImages', val)}
                  expandCodeBlocksByDefault={settings.expandCodeBlocksByDefault}
                  setExpandCodeBlocksByDefault={(val) => updateSetting('expandCodeBlocksByDefault', val)}
                  t={t}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0">
          <SettingsActions
            onSave={handleSave}
            onCancel={handleClose}
            onReset={handleResetToDefaults}
            t={t}
          />
        </div>
      </div>
    </Modal>
  );
};