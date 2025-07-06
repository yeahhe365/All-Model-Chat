import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { Settings2, X } from 'lucide-react';
import { DEFAULT_CHAT_SETTINGS, DEFAULT_APP_SETTINGS, APP_SETTINGS_KEY, PRELOADED_SCENARIO_KEY, CHAT_HISTORY_SESSIONS_KEY, ACTIVE_CHAT_SESSION_ID_KEY, AVAILABLE_TTS_VOICES } from '../constants/appConstants';
import { DEFAULT_THEME_ID, Theme } from '../constants/themeConstants';
import { translations } from '../utils/appUtils';
import { ApiConfigSection } from './settings/ApiConfigSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { ChatBehaviorSection } from './settings/ChatBehaviorSection';
import { DataManagementSection } from './settings/DataManagementSection';
import { SettingsActions } from './settings/SettingsActions';
import { ModelOption } from '../types';

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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentSettings, availableModels, availableThemes, 
  onSave, isModelsLoading, modelsLoadingError, onClearAllHistory, onClearCache, onOpenLogViewer, t
}) => {
  const [settings, setSettings] = useState(currentSettings);
  const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(currentSettings);
      setIsActuallyOpen(true);
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setIsActuallyOpen(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentSettings]);

  if (!isActuallyOpen) return null;

  const handleClose = () => {
    if (isOpen) onClose();
  };
  
  const handleSave = () => {
    onSave(settings);
  };
  
  const handleResetToDefaults = () => {
    setSettings(DEFAULT_APP_SETTINGS);
  };

  const handleClearHistory = () => {
    const confirmed = window.confirm(t('settingsClearHistory_confirm'));
    if (confirmed) {
      onClearAllHistory();
      onClose(); // Close the modal after clearing
    }
  };

  const handleClearCache = () => {
    const confirmed = window.confirm(t('settingsClearCache_confirm'));
    if (confirmed) {
      onClearCache();
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const headingIconSize = window.innerWidth < 640 ? 16 : 18;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="settings-title"
      onClick={handleClose}
    >
      <div 
        className={`bg-[var(--theme-bg-primary)] p-3 sm:p-4 md:p-5 rounded-xl shadow-premium w-full max-w-md sm:max-w-lg md:max-w-xl flex flex-col max-h-[90vh] ${isOpen ? 'modal-enter-animation' : 'modal-exit-animation'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 id="settings-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
             <Settings2 size={headingIconSize + 2} className="mr-2.5 opacity-80" /> {t('settingsTitle')}
          </h2>
          <button ref={closeButtonRef} onClick={handleClose} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors p-1 rounded-full" aria-label="Close settings">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar -mr-2 flex-grow min-h-0"> 
          <ApiConfigSection
            useCustomApiConfig={settings.useCustomApiConfig}
            setUseCustomApiConfig={(val) => updateSetting('useCustomApiConfig', val)}
            apiKey={settings.apiKey}
            setApiKey={(val) => updateSetting('apiKey', val)}
            apiProxyUrl={settings.apiProxyUrl}
            setApiProxyUrl={(val) => updateSetting('apiProxyUrl', val)}
            t={t}
          />
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
            t={t}
          />
          <DataManagementSection
            onClearHistory={handleClearHistory}
            onClearCache={handleClearCache}
            t={t}
          />
        </div>
        
        <SettingsActions
          onSave={handleSave}
          onCancel={handleClose}
          onReset={handleResetToDefaults}
          onOpenLogViewer={onOpenLogViewer}
          t={t}
        />
      </div>
    </div>
  );
};
