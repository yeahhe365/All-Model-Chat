



import React, { useState, useEffect } from 'react';
import { ModelOption, AppSettings, ChatSettings as IndividualChatSettings } from '../types';
import { Loader2, X, Info, Pin, Wand2, RotateCcw, Ban, Save, Eye, EyeOff, KeyRound, Server, ToggleLeft, ToggleRight, Settings2, Trash2 } from 'lucide-react'; 
import { 
    DEFAULT_CHAT_SETTINGS,
    DEFAULT_APP_SETTINGS, 
    DEFAULT_THEME_ID as APP_DEFAULT_THEME_ID, 
    Theme,
    APP_SETTINGS_KEY,
    STREAMING_ENABLED_KEY,
    PRELOADED_SCENARIO_KEY,
    CHAT_HISTORY_SESSIONS_KEY,
    ACTIVE_CHAT_SESSION_ID_KEY
} from '../constants';
import { translations } from '../utils/appUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings; 
  availableModels: ModelOption[];
  availableThemes: Theme[]; 
  onSave: (newSettings: AppSettings) => void; 
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  t: (key: keyof typeof translations) => string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  availableModels,
  availableThemes, 
  onSave,
  isModelsLoading,
  modelsLoadingError,
  t
}) => {
  const [useCustomApiConfig, setUseCustomApiConfig] = useState(currentSettings.useCustomApiConfig);
  const [apiKey, setApiKey] = useState(currentSettings.apiKey);
  const [apiUrl, setApiUrl] = useState(currentSettings.apiUrl);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [modelId, setModelId] = useState(currentSettings.modelId);
  const [temperature, setTemperature] = useState(currentSettings.temperature);
  const [topP, setTopP] = useState(currentSettings.topP);
  const [showThoughts, setShowThoughts] = useState(currentSettings.showThoughts);
  const [systemInstruction, setSystemInstructionLocal] = useState(currentSettings.systemInstruction);
  const [themeId, setThemeId] = useState(currentSettings.themeId); 
  const [baseFontSize, setBaseFontSize] = useState(currentSettings.baseFontSize);
  const [language, setLanguage] = useState(currentSettings.language);


  useEffect(() => {
    if (isOpen) {
      setUseCustomApiConfig(currentSettings.useCustomApiConfig ?? DEFAULT_APP_SETTINGS.useCustomApiConfig);
      setApiKey(currentSettings.apiKey ?? null);
      setApiUrl(currentSettings.apiUrl ?? null);
      setShowApiKey(false);
      
      setModelId(currentSettings.modelId || DEFAULT_CHAT_SETTINGS.modelId);
      setTemperature(currentSettings.temperature ?? DEFAULT_CHAT_SETTINGS.temperature);
      setTopP(currentSettings.topP ?? DEFAULT_CHAT_SETTINGS.topP);
      setShowThoughts(currentSettings.showThoughts ?? DEFAULT_CHAT_SETTINGS.showThoughts);
      setSystemInstructionLocal(currentSettings.systemInstruction ?? DEFAULT_CHAT_SETTINGS.systemInstruction);
      setThemeId(currentSettings.themeId || APP_DEFAULT_THEME_ID); 
      setBaseFontSize(currentSettings.baseFontSize ?? DEFAULT_APP_SETTINGS.baseFontSize);
      setLanguage(currentSettings.language || DEFAULT_APP_SETTINGS.language);
    }
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ 
        modelId, temperature, topP, showThoughts, systemInstruction, 
        themeId, baseFontSize, 
        useCustomApiConfig, 
        apiKey: useCustomApiConfig ? apiKey : null, 
        apiUrl: useCustomApiConfig ? apiUrl : null,
        language,
    }); 
  };
  
  const handleResetToDefaults = () => {
    setUseCustomApiConfig(DEFAULT_APP_SETTINGS.useCustomApiConfig);
    setApiKey(DEFAULT_APP_SETTINGS.apiKey);
    setApiUrl(DEFAULT_APP_SETTINGS.apiUrl);
    setShowApiKey(false);

    setModelId(DEFAULT_CHAT_SETTINGS.modelId);
    setTemperature(DEFAULT_CHAT_SETTINGS.temperature); 
    setTopP(DEFAULT_CHAT_SETTINGS.topP);           
    setShowThoughts(DEFAULT_CHAT_SETTINGS.showThoughts);
    setSystemInstructionLocal(DEFAULT_CHAT_SETTINGS.systemInstruction);
    setThemeId(APP_DEFAULT_THEME_ID); 
    setBaseFontSize(DEFAULT_APP_SETTINGS.baseFontSize);
    setLanguage(DEFAULT_APP_SETTINGS.language);
  };

  const handleClearCache = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all cached application data?\n\nThis will remove:\n- Saved settings\n- Chat history\n- Preloaded scenarios\n\nThis action cannot be undone."
    );
    if (confirmed) {
      localStorage.removeItem(APP_SETTINGS_KEY);
      localStorage.removeItem(STREAMING_ENABLED_KEY);
      localStorage.removeItem(PRELOADED_SCENARIO_KEY);
      localStorage.removeItem(CHAT_HISTORY_SESSIONS_KEY);
      localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
      window.location.reload();
    }
  };
  
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const disabledInputClasses = "bg-[var(--theme-bg-secondary)] border-[var(--theme-border-primary)] opacity-60 cursor-not-allowed";
  const iconSize = window.innerWidth < 640 ? 14 : 16;
  const headingIconSize = window.innerWidth < 640 ? 16 : 18;
  const actionButtonIconSize = window.innerWidth < 640 ? 12 : 14;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="bg-[var(--theme-bg-primary)] p-3 sm:p-4 md:p-5 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl transform transition-all scale-100 opacity-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 id="settings-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
             <Settings2 size={headingIconSize + 2} className="mr-2.5 opacity-80" /> {t('settingsTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors p-1 rounded-full"
            aria-label="Close settings"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar -mr-2 flex-grow min-h-0"> 
          {/* API Configuration Section */}
          <div className="space-y-3 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
            <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-2">
              <KeyRound size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
              {t('settingsApiConfig')}
            </h3>

            {/* Use Custom API Config Toggle */}
            <div className="flex items-center justify-between py-1">
              <label htmlFor="use-custom-api-config-toggle" className="text-sm font-medium text-[var(--theme-text-secondary)]">
                {t('settingsUseCustomApi')}
              </label>
              <button
                id="use-custom-api-config-toggle"
                onClick={() => setUseCustomApiConfig(!useCustomApiConfig)}
                className={`p-0.5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] ${
                  useCustomApiConfig ? 'bg-[var(--theme-bg-accent)] focus:ring-[var(--theme-bg-accent)]' : 'bg-[var(--theme-bg-input)] focus:ring-[var(--theme-border-focus)]'
                }`}
                aria-pressed={useCustomApiConfig}
              >
                {useCustomApiConfig ? <ToggleRight size={iconSize + 4} className="text-white" /> : <ToggleLeft size={iconSize + 4} className="text-[var(--theme-text-tertiary)]" />}
              </button>
            </div>
            {!useCustomApiConfig && (
                 <p className="text-xs text-[var(--theme-text-tertiary)] flex items-center bg-[var(--theme-bg-info)] bg-opacity-30 p-2 rounded-md border border-[var(--theme-border-secondary)]">
                    <Info size={14} className="mr-2 flex-shrink-0 text-[var(--theme-text-info)]" />
                    Using default API setup from environment. Enable for custom settings.
                </p>
            )}

            {/* API Key */}
            <div className={`${!useCustomApiConfig ? 'opacity-50' : ''}`}>
              <label htmlFor="api-key-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsApiKey')}</label>
              <div className="relative">
                <input
                  id="api-key-input"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey || ''}
                  onChange={(e) => setApiKey(e.target.value || null)}
                  className={`${inputBaseClasses} ${useCustomApiConfig ? enabledInputClasses : disabledInputClasses} pr-8`}
                  placeholder={useCustomApiConfig ? "Enter your Gemini API Key" : "Using default"}
                  aria-label="Gemini API Key input"
                  disabled={!useCustomApiConfig}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 px-2 flex items-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] disabled:cursor-not-allowed"
                  aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
                  disabled={!useCustomApiConfig}
                >
                  {showApiKey ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
                </button>
              </div>
            </div>

            {/* API URL */}
            <div className={`${!useCustomApiConfig ? 'opacity-50' : ''}`}>
              <label htmlFor="api-url-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsApiUrl')}</label>
              <input
                id="api-url-input"
                type="text"
                value={apiUrl || ''}
                onChange={(e) => setApiUrl(e.target.value || null)}
                className={`${inputBaseClasses} ${useCustomApiConfig ? enabledInputClasses : disabledInputClasses}`}
                placeholder={useCustomApiConfig ? "e.g., https://your-proxy.com/v1beta" : "Using default"}
                aria-label="Gemini API URL input"
                disabled={!useCustomApiConfig}
              />
            </div>
          </div>
          
          {/* Appearance Section */}
          <div className="space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
             <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
              <Wand2 size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
              {t('settingsAppearance')}
            </h3>
            {/* Theme Selection */}
            <div>
              <label htmlFor="theme-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsTheme')}</label>
              <div className="relative">
                  <select
                    id="theme-select"
                    value={themeId}
                    onChange={(e) => setThemeId(e.target.value)}
                    className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
                    aria-label="Select application theme"
                  >
                    {availableThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
                  </div>
              </div>
            </div>
            {/* Base Font Size */}
            <div>
              <label htmlFor="base-font-size-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
                {t('settingsFontSize')}: <span className="font-mono text-[var(--theme-text-link)]">{baseFontSize}px</span>
              </label>
              <input
                id="base-font-size-slider"
                type="range"
                min="12"
                max="24"
                step="1"
                value={baseFontSize}
                onChange={(e) => setBaseFontSize(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]"
                aria-label={`Base font size for the application: ${baseFontSize}px`}
              />
            </div>
             {/* Language Selection */}
            <div>
              <label htmlFor="language-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsLanguage')}</label>
              <div className="relative">
                  <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'zh' | 'system')}
                    className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
                    aria-label="Select application language"
                  >
                    <option value="system">{t('settingsLanguageSystem')}</option>
                    <option value="en">{t('settingsLanguageEn')}</option>
                    <option value="zh">{t('settingsLanguageZh')}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
                  </div>
              </div>
            </div>
          </div>

          {/* Chat Behavior Section */}
          <div className="space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
            <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
              <Settings2 size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
              {t('settingsChatBehavior')}
            </h3>
            {/* Model Selection */}
            <div>
              <label htmlFor="model-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsModel')}</label>
              {isModelsLoading ? (
                <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2 w-full">
                  <Loader2 size={iconSize} className="animate-spin mr-2.5 text-[var(--theme-text-link)]" />
                  <span>Loading models...</span>
                </div>
              ) : modelsLoadingError ? (
                  <div className="text-sm text-[var(--theme-text-danger)] p-2 bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{modelsLoadingError}</div>
              ) : (
                <div className="relative">
                  <select
                    id="model-select"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
                    disabled={availableModels.length === 0}
                    aria-label="Select AI Model for current or new chats"
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.isPinned ? '📌 ' : ''}{model.name}
                      </option>
                    ))}
                    {availableModels.length === 0 && <option value="" disabled>No models available</option>}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
                  </div>
                </div>
              )}
            </div>
            {/* System Prompt */}
            <div>
              <label htmlFor="system-prompt-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
                  {t('settingsSystemPrompt')}
                  {isSystemPromptSet && (
                      <span className="ml-2 w-2.5 h-2.5 bg-[var(--theme-bg-success)] opacity-70 rounded-full" title="System prompt is active" aria-label="System prompt is active"></span>
                  )}
              </label>
              <textarea
                id="system-prompt-input"
                value={systemInstruction}
                onChange={(e) => setSystemInstructionLocal(e.target.value)}
                rows={3}
                className={`${inputBaseClasses} ${enabledInputClasses} resize-y min-h-[60px]`}
                placeholder="e.g., You are a helpful AI assistant that speaks like a pirate."
                aria-label="System prompt text area for current or new chats"
              />
            </div>
            {/* Temperature */}
            <div>
              <label htmlFor="temperature-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
                {t('settingsTemperature')}: <span className="font-mono text-[var(--theme-text-link)]">{Number(temperature).toFixed(2)}</span>
              </label>
              <input
                id="temperature-slider"
                type="range"
                min="0"
                max="2" 
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]"
                aria-label={`Temperature for current/new chats: ${Number(temperature).toFixed(2)}`}
              />
            </div>
            {/* Top P */}
            <div>
              <label htmlFor="top-p-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
                {t('settingsTopP')}: <span className="font-mono text-[var(--theme-text-link)]">{Number(topP).toFixed(2)}</span>
              </label>
              <input
                id="top-p-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]"
                aria-label={`Top P for current/new chats: ${Number(topP).toFixed(2)}`}
              />
            </div>
            {/* Show Thoughts */}
            <div className="flex items-center justify-between py-1">
              <label htmlFor="show-thoughts-toggle" className="text-sm font-medium text-[var(--theme-text-secondary)]">
                {t('settingsShowThoughts')}
              </label>
              <button
                id="show-thoughts-toggle"
                onClick={() => setShowThoughts(!showThoughts)}
                className={`p-0.5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] ${
                  showThoughts ? 'bg-[var(--theme-bg-accent)] focus:ring-[var(--theme-bg-accent)]' : 'bg-[var(--theme-bg-input)] focus:ring-[var(--theme-border-focus)]'
                }`}
                aria-pressed={showThoughts}
              >
                {showThoughts ? <ToggleRight size={iconSize + 4} className="text-white" /> : <ToggleLeft size={iconSize + 4} className="text-[var(--theme-text-tertiary)]" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-[var(--theme-border-primary)] flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleResetToDefaults}
                type="button"
                className="flex-1 sm:flex-initial px-3 py-1.5 border border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-secondary)] flex items-center justify-center gap-1.5 text-sm"
                aria-label="Reset settings to default"
              >
                <RotateCcw size={actionButtonIconSize} />
                <span>{t('settingsReset')}</span>
              </button>
              <button
                onClick={handleClearCache}
                type="button"
                className="flex-1 sm:flex-initial px-3 py-1.5 border border-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)] hover:bg-opacity-10 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-bg-danger)] flex items-center justify-center gap-1.5 text-sm"
                aria-label="Clear all cached application data"
              >
                <Trash2 size={actionButtonIconSize} />
                <span>{t('settingsClearCache')}</span>
              </button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                type="button"
                className="flex-1 sm:flex-initial px-4 py-1.5 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-primary)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-secondary)] flex items-center justify-center gap-1.5 text-sm"
              >
                <Ban size={actionButtonIconSize} />
                <span>{t('settingsCancel')}</span>
              </button>
              <button
                onClick={handleSave}
                type="button"
                className="flex-1 sm:flex-initial px-4 py-1.5 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] flex items-center justify-center gap-1.5 text-sm"
              >
                <Save size={actionButtonIconSize} />
                <span>{t('settingsSave')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};