


import React, { useState, useEffect } from 'react';
import { ModelOption, AppSettings, ChatSettings as IndividualChatSettings } from '../types';
import { Loader2, X, Info, Pin, Wand2, RotateCcw, Ban, Save, Eye, EyeOff, KeyRound, Server, ToggleLeft, ToggleRight, Settings2 } from 'lucide-react'; 
import { 
    DEFAULT_CHAT_SETTINGS,
    DEFAULT_APP_SETTINGS, 
    DEFAULT_THEME_ID as APP_DEFAULT_THEME_ID, 
    Theme
} from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings; 
  availableModels: ModelOption[];
  availableThemes: Theme[]; 
  onSave: (newSettings: AppSettings) => void; 
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  availableModels,
  availableThemes, 
  onSave,
  isModelsLoading,
  modelsLoadingError
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
    }
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ 
        modelId, temperature, topP, showThoughts, systemInstruction, 
        themeId, baseFontSize, 
        useCustomApiConfig, 
        apiKey: useCustomApiConfig ? apiKey : null, 
        apiUrl: useCustomApiConfig ? apiUrl : null 
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
  };
  
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";
  const inputBaseClasses = "w-full p-2 sm:p-2.5 border rounded-md focus:ring-1 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const disabledInputClasses = "bg-[var(--theme-bg-secondary)] border-[var(--theme-border-primary)] opacity-60 cursor-not-allowed";
  const iconSize = window.innerWidth < 640 ? 16 : 18;
  const headingIconSize = window.innerWidth < 640 ? 20 : 22;
  const actionButtonIconSize = window.innerWidth < 640 ? 14 : 16;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="bg-[var(--theme-bg-tertiary)] p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg transform transition-all scale-100 opacity-100">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 id="settings-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
             <Settings2 size={headingIconSize} className="mr-2 opacity-80" /> Chat Settings
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 sm:space-y-5 max-h-[70vh] overflow-y-auto pr-2 sm:pr-3 -mr-2 sm:-mr-3 custom-scrollbar"> 
          {/* API Configuration Section */}
          <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
            <h3 className="text-base sm:text-md font-semibold text-[var(--theme-text-primary)] flex items-center mb-2 sm:mb-3">
              <KeyRound size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
              API Configuration
            </h3>

            {/* Use Custom API Config Toggle */}
            <div className="flex items-center justify-between py-1">
              <label htmlFor="use-custom-api-config-toggle" className="text-sm font-medium text-[var(--theme-text-secondary)]">
                Use Custom API Configuration
              </label>
              <button
                id="use-custom-api-config-toggle"
                onClick={() => setUseCustomApiConfig(!useCustomApiConfig)}
                className={`p-0.5 sm:p-1 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] ${
                  useCustomApiConfig ? 'bg-[var(--theme-bg-accent)] focus:ring-[var(--theme-bg-accent)]' : 'bg-[var(--theme-bg-input)] focus:ring-[var(--theme-border-focus)]'
                }`}
                aria-pressed={useCustomApiConfig}
              >
                {useCustomApiConfig ? <ToggleRight size={iconSize + 4} className="text-white" /> : <ToggleLeft size={iconSize + 4} className="text-[var(--theme-text-tertiary)]" />}
              </button>
            </div>
            {!useCustomApiConfig && (
                 <p className="text-xs text-[var(--theme-text-tertiary)] flex items-center bg-[var(--theme-bg-info)] bg-opacity-30 p-1.5 sm:p-2 rounded-md border border-[var(--theme-border-secondary)]">
                    <Info size={12} className="mr-1.5 flex-shrink-0 text-[var(--theme-text-info)]" />
                    Currently using default API setup (via `process.env.API_KEY`). Enable toggle for custom settings.
                </p>
            )}

            {/* API Key */}
            <div className={`${!useCustomApiConfig ? 'opacity-50' : ''}`}>
              <label htmlFor="api-key-input" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">Gemini API Key</label>
              <div className="relative">
                <input
                  id="api-key-input"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey || ''}
                  onChange={(e) => setApiKey(e.target.value || null)}
                  className={`${inputBaseClasses} ${useCustomApiConfig ? enabledInputClasses : disabledInputClasses} pr-8 sm:pr-10`}
                  placeholder={useCustomApiConfig ? "Enter your Gemini API Key" : "Using default"}
                  aria-label="Gemini API Key input"
                  disabled={!useCustomApiConfig}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 px-2 sm:px-3 flex items-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] disabled:cursor-not-allowed"
                  aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
                  disabled={!useCustomApiConfig}
                >
                  {showApiKey ? <EyeOff size={iconSize-2} /> : <Eye size={iconSize-2} />}
                </button>
              </div>
              {useCustomApiConfig && (
                <p className="mt-1 text-xs text-[var(--theme-text-tertiary)]">
                    Your custom API key for Gemini services.
                </p>
              )}
            </div>

            {/* API URL */}
            <div className={`${!useCustomApiConfig ? 'opacity-50' : ''}`}>
              <label htmlFor="api-url-input" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">Gemini API URL (Optional)</label>
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
               {useCustomApiConfig && (
                <p className="mt-1 text-xs text-[var(--theme-text-tertiary)]">
                    Advanced: Override default API endpoint. Standard SDK may not use this directly.
                </p>
               )}
            </div>
          </div>
          
          {/* Theme Selection */}
          <div>
            <label htmlFor="theme-select" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">Theme (Global)</label>
            <div className="relative">
                <select
                  id="theme-select"
                  value={themeId}
                  onChange={(e) => setThemeId(e.target.value)}
                  className="bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-sm rounded-lg focus:ring-1 focus:ring-[var(--theme-border-focus)] focus:border-[var(--theme-border-focus)] block w-full p-2 sm:p-2.5 appearance-none pr-8"
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
            <label htmlFor="base-font-size-slider" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
              Base Font Size (Global): <span className="font-mono text-[var(--theme-text-link)]">{baseFontSize}px</span>
            </label>
            <input
              id="base-font-size-slider"
              type="range"
              min="12"
              max="28"
              step="1"
              value={baseFontSize}
              onChange={(e) => setBaseFontSize(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]"
              aria-label={`Base font size for the application: ${baseFontSize}px`}
            />
             <p className="mt-1 text-xs text-[var(--theme-text-tertiary)] flex items-center">
              <Info size={12} className="mr-1 flex-shrink-0 text-[var(--theme-text-link)]" />
              Adjusts the root font size. Most text will scale relatively. Default: {DEFAULT_APP_SETTINGS.baseFontSize}px.
            </p>
          </div>
          
          {/* Model Selection */}
          <div>
            <label htmlFor="model-select" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">AI Model (Current/New Chats)</label>
            {isModelsLoading ? (
              <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2 sm:p-2.5 w-full">
                <Loader2 size={iconSize-2} className="animate-spin mr-2 text-[var(--theme-text-link)]" />
                <span>Loading models...</span>
              </div>
            ) : modelsLoadingError ? (
                 <div className="text-sm text-[var(--theme-text-danger)] p-2 sm:p-2.5 bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{modelsLoadingError}</div>
            ) : (
              <div className="relative">
                <select
                  id="model-select"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-sm rounded-lg focus:ring-1 focus:ring-[var(--theme-border-focus)] focus:border-[var(--theme-border-focus)] block w-full p-2 sm:p-2.5 appearance-none pr-8"
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
            <label htmlFor="system-prompt-input" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1 flex items-center">
                System Prompt (Current/New Chats)
                {isSystemPromptSet && (
                    <span 
                        className="ml-2 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[var(--theme-bg-success)] opacity-70 rounded-full" 
                        title="System prompt is active for current/new chats"
                        aria-label="System prompt is active for current/new chats"
                    ></span>
                )}
            </label>
            <textarea
              id="system-prompt-input"
              value={systemInstruction}
              onChange={(e) => setSystemInstructionLocal(e.target.value)}
              rows={3}
              className="w-full p-2 sm:p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] resize-y text-sm"
              placeholder="e.g., You are a helpful AI assistant that speaks like a pirate."
              aria-label="System prompt text area for current or new chats"
            />
          </div>

          {/* Temperature */}
          <div>
            <label htmlFor="temperature-slider" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
              Temperature (Current/New Chats): <span className="font-mono text-[var(--theme-text-link)]">{Number(temperature).toFixed(2)}</span>
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
            <label htmlFor="top-p-slider" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
              Top P (Current/New Chats): <span className="font-mono text-[var(--theme-text-link)]">{Number(topP).toFixed(2)}</span>
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
          <div className="flex items-center">
            <input
              id="show-thoughts"
              type="checkbox"
              checked={showThoughts}
              onChange={(e) => setShowThoughts(e.target.checked)}
              className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--theme-bg-accent)] bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] rounded focus:ring-1 focus:ring-[var(--theme-border-focus)] focus:ring-offset-1 focus:ring-offset-[var(--theme-bg-tertiary)]"
              aria-labelledby="show-thoughts-label"
            />
            <label id="show-thoughts-label" htmlFor="show-thoughts" className="ml-2 text-sm text-[var(--theme-text-secondary)]">
              Show Assistant's Thoughts (Current/New Chats)
            </label>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-[var(--theme-border-primary)]">
          <button
            onClick={handleResetToDefaults}
            type="button"
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 border border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-secondary)] focus:ring-opacity-75 w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            aria-label="Reset settings to default"
            title="Reset to Defaults"
          >
            <RotateCcw size={actionButtonIconSize} />
            <span>Reset</span>
          </button>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 sm:flex-initial px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-primary)] rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-secondary)] focus:ring-opacity-75 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              aria-label="Cancel settings changes"
              title="Cancel"
            >
              <Ban size={actionButtonIconSize} />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              type="button"
              className="flex-1 sm:flex-initial px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-75 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              aria-label="Save chat settings"
              title="Save Settings"
            >
              <Save size={actionButtonIconSize} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};