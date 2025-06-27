import React from 'react';
import { ModelOption } from '../../types';
import { Loader2, Settings2, Info } from 'lucide-react';
import { AVAILABLE_TTS_VOICES } from '../../constants/appConstants';

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="tooltip-container ml-1.5">
    {children}
    <span className="tooltip-text">{text}</span>
  </div>
);

interface ChatBehaviorSectionProps {
  modelId: string;
  setModelId: (value: string) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  availableModels: ModelOption[];
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  isStreamingEnabled: boolean;
  setIsStreamingEnabled: (value: boolean) => void;
  t: (key: string) => string;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = ({
  modelId, setModelId, isModelsLoading, modelsLoadingError, availableModels,
  ttsVoice, setTtsVoice, systemInstruction, setSystemInstruction,
  temperature, setTemperature, topP, setTopP, showThoughts, setShowThoughts, 
  isStreamingEnabled, setIsStreamingEnabled, t
}) => {
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const iconSize = window.innerWidth < 640 ? 14 : 16;
  
  return (
    <div className="space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
        <Settings2 size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsChatBehavior')}
      </h3>
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
              id="model-select" value={modelId} onChange={(e) => setModelId(e.target.value)}
              className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
              disabled={availableModels.length === 0}
              aria-label="Select AI Model for current or new chats"
            >
              {availableModels.map((model) => ( <option key={model.id} value={model.id}>{model.isPinned ? '📌 ' : ''}{model.name}</option> ))}
              {availableModels.length === 0 && <option value="" disabled>No models available</option>}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
            </div>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="tts-voice-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsTtsVoice')}</label>
        <div className="relative">
          <select
            id="tts-voice-select" value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}
            className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
            aria-label="Select TTS Voice for speech generation"
          >
            {AVAILABLE_TTS_VOICES.map((voice) => ( <option key={voice.id} value={voice.id}>{voice.name}</option> ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="system-prompt-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
            {t('settingsSystemPrompt')}
            {isSystemPromptSet && <span className="ml-2 w-2.5 h-2.5 bg-green-400 bg-opacity-70 rounded-full" title="System prompt is active" />}
        </label>
        <textarea
          id="system-prompt-input" value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)}
          rows={3} className={`${inputBaseClasses} ${enabledInputClasses} resize-y min-h-[60px] custom-scrollbar`}
          placeholder="e.g., You are a helpful AI assistant."
          aria-label="System prompt text area"
        />
      </div>
      <div>
        <label htmlFor="temperature-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
            <span className='flex items-center'>
                {t('settingsTemperature')}: <span className="font-mono text-[var(--theme-text-link)] ml-1">{Number(temperature).toFixed(2)}</span>
                <Tooltip text="Controls randomness. Lower values (~0.2) make the model more deterministic and focused. Higher values (~1.0) make it more creative and diverse.">
                    <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
            </span>
        </label>
        <input id="temperature-slider" type="range" min="0" max="2" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]" />
      </div>
      <div>
        <label htmlFor="top-p-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
             <span className='flex items-center'>
                {t('settingsTopP')}: <span className="font-mono text-[var(--theme-text-link)] ml-1">{Number(topP).toFixed(2)}</span>
                <Tooltip text="Controls diversity by sampling from a probability mass. Lower values (~0.1) keep the model's choices very focused, while higher values (~0.95) allow for more variety.">
                    <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
            </span>
        </label>
        <input id="top-p-slider" type="range" min="0" max="1" step="0.05" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))}
          className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]" />
      </div>
      <label htmlFor="show-thoughts-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)]">{t('settingsShowThoughts')}</span>
        <div className="relative">
          <input id="show-thoughts-toggle" type="checkbox" className="sr-only peer" checked={showThoughts} onChange={() => setShowThoughts(!showThoughts)} />
          <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)]"></div>
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
        </div>
      </label>
      <label htmlFor="streaming-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)]">{t('headerStream')}</span>
        <div className="relative">
          <input id="streaming-toggle" type="checkbox" className="sr-only peer" checked={isStreamingEnabled} onChange={() => setIsStreamingEnabled(!isStreamingEnabled)} />
          <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)]"></div>
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
        </div>
      </label>
    </div>
  );
};