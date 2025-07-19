import React, { useState } from 'react';
import { ModelOption } from '../../types';
import { Loader2, Settings2, Info, Mic, Volume2 } from 'lucide-react';
import { AVAILABLE_TTS_VOICES, AVAILABLE_TRANSCRIPTION_MODELS } from '../../constants/appConstants';
import { getResponsiveValue } from '../../utils/appUtils';

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
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
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
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  isStreamingEnabled: boolean;
  setIsStreamingEnabled: (value: boolean) => void;
  isTranscriptionThinkingEnabled: boolean;
  setIsTranscriptionThinkingEnabled: (value: boolean) => void;
  useFilesApiForImages: boolean;
  setUseFilesApiForImages: (value: boolean) => void;
  expandCodeBlocksByDefault: boolean;
  setExpandCodeBlocksByDefault: (value: boolean) => void;
  isAutoTitleEnabled: boolean;
  setIsAutoTitleEnabled: (value: boolean) => void;
  t: (key: string) => string;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = ({
  modelId, setModelId, isModelsLoading, modelsLoadingError, availableModels,
  transcriptionModelId, setTranscriptionModelId, ttsVoice, setTtsVoice, 
  systemInstruction, setSystemInstruction, temperature, setTemperature, topP, setTopP, 
  showThoughts, setShowThoughts, thinkingBudget, setThinkingBudget,
  isStreamingEnabled, setIsStreamingEnabled, 
  isTranscriptionThinkingEnabled, setIsTranscriptionThinkingEnabled, 
  useFilesApiForImages, setUseFilesApiForImages,
  expandCodeBlocksByDefault, setExpandCodeBlocksByDefault,
  isAutoTitleEnabled, setIsAutoTitleEnabled, t
}) => {
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const iconSize = getResponsiveValue(14, 16);
  
  type ThinkingMode = 'off' | 'auto' | 'manual';
  
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>(() => {
    if (!showThoughts) return 'off';
    if (thinkingBudget === -1) return 'auto';
    return 'manual';
  });

  const handleThinkingModeChange = (mode: ThinkingMode) => {
    setThinkingMode(mode);
    switch (mode) {
      case 'off':
        setShowThoughts(false);
        setThinkingBudget(0);
        break;
      case 'auto':
        setShowThoughts(true);
        setThinkingBudget(-1);
        break;
      case 'manual':
        setShowThoughts(true);
        if (thinkingBudget < 1) {
          setThinkingBudget(100); 
        }
        break;
    }
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
        <Settings2 size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsChatBehavior')}
      </h3>
      
      {/* --- Model & Voice Settings --- */}
      <div className="space-y-4">
        <div>
          <label htmlFor="model-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsDefaultModel')}</label>
          {isModelsLoading ? (
            <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2 w-full">
              <Loader2 size={iconSize} className="animate-spin mr-2.5 text-[var(--theme-text-link)]" />
              <span>{t('chatBehavior_model_loading')}</span>
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
                {availableModels.length === 0 && <option value="" disabled>{t('chatBehavior_model_noModels')}</option>}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
              </div>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="transcription-model-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
              <span className='flex items-center'>
                  <Mic size={iconSize-2} className="mr-2" /> {t('chatBehavior_voiceModel_label')}
                  <Tooltip text={t('chatBehavior_voiceModel_tooltip')}>
                      <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                  </Tooltip>
              </span>
          </label>
          <div className="relative">
            <select
              id="transcription-model-select" value={transcriptionModelId} onChange={(e) => setTranscriptionModelId(e.target.value)}
              className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
              aria-label="Select AI Model for voice input transcription"
            >
              {AVAILABLE_TRANSCRIPTION_MODELS.map((model) => ( <option key={model.id} value={model.id}>{model.name}</option>))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
            </div>
          </div>
        </div>
         <label htmlFor="transcription-thinking-toggle" className="flex items-center justify-between py-1 cursor-pointer">
          <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
            {t('settingsTranscriptionThinking')}
            <Tooltip text={t('chatBehavior_transcriptionThinking_tooltip')}>
              <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
            </Tooltip>
          </span>
          <div className="relative">
            <input id="transcription-thinking-toggle" type="checkbox" className="sr-only peer" checked={isTranscriptionThinkingEnabled} onChange={() => setIsTranscriptionThinkingEnabled(!isTranscriptionThinkingEnabled)} />
            <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)]"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
          </div>
        </label>
        <div>
          <label htmlFor="tts-voice-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
            <span className="flex items-center">
              <Volume2 size={iconSize-2} className="mr-2" /> {t('settingsTtsVoice')}
            </span>
          </label>
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
      </div>
      
      {/* --- Generation Settings --- */}
      <div className="space-y-4 pt-4 mt-4 border-t border-[var(--theme-border-primary)] border-opacity-50">
        <div>
          <label htmlFor="system-prompt-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
              {t('settingsSystemPrompt')}
              {isSystemPromptSet && <span className="ml-2 w-2.5 h-2.5 bg-green-400 bg-opacity-70 rounded-full" title="System prompt is active" />}
          </label>
          <textarea
            id="system-prompt-input" value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)}
            rows={3} className={`${inputBaseClasses} ${enabledInputClasses} resize-y min-h-[60px] custom-scrollbar`}
            placeholder={t('chatBehavior_systemPrompt_placeholder')}
            aria-label="System prompt text area"
          />
        </div>
        <div>
          <label htmlFor="temperature-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
              <span className='flex items-center'>
                  {t('settingsTemperature')}: <span className="font-mono text-[var(--theme-text-link)] ml-1">{Number(temperature).toFixed(2)}</span>
                  <Tooltip text={t('chatBehavior_temp_tooltip')}>
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
                  <Tooltip text={t('chatBehavior_topP_tooltip')}>
                      <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                  </Tooltip>
              </span>
          </label>
          <input id="top-p-slider" type="range" min="0" max="1" step="0.05" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))}
            className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
            <span className='flex items-center'>
              {t('settingsShowThoughts')}
              <Tooltip text={t('chatBehavior_enableThoughts_tooltip')}>
                <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
              </Tooltip>
            </span>
          </label>
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => handleThinkingModeChange('off')}
              className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-[var(--theme-border-secondary)] text-sm font-medium ${
                thinkingMode === 'off' ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-[var(--theme-bg-accent)] z-10' : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
              } focus:z-10 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] transition-colors`}
            >
              Off
            </button>
            <button
              type="button"
              onClick={() => handleThinkingModeChange('auto')}
              className={`relative inline-flex items-center px-4 py-2 border-t border-b border-[var(--theme-border-secondary)] text-sm font-medium ${
                thinkingMode === 'auto' ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-[var(--theme-bg-accent)] z-10' : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
              } focus:z-10 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] transition-colors -ml-px`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => handleThinkingModeChange('manual')}
              className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-[var(--theme-border-secondary)] text-sm font-medium ${
                thinkingMode === 'manual' ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-[var(--theme-bg-accent)] z-10' : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
              } focus:z-10 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] transition-colors -ml-px`}
            >
              Manual
            </button>
          </div>
          {thinkingMode === 'manual' && (
            <div className="pl-0 mt-3 space-y-1" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
              <label htmlFor="thinking-budget-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
                <span className='flex items-center'>
                  {t('settingsThinkingBudget')}
                  <Tooltip text={t('settingsThinkingBudget_tooltip')}>
                    <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                  </Tooltip>
                </span>
              </label>
              <input
                id="thinking-budget-input"
                type="number"
                value={thinkingBudget}
                onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    setThinkingBudget(isNaN(num) ? 0 : num);
                }}
                className={`${inputBaseClasses} ${enabledInputClasses}`}
                placeholder={t('settingsThinkingBudget_placeholder')}
                aria-label="Thinking budget input"
              />
            </div>
          )}
        </div>
        <label htmlFor="streaming-toggle" className="flex items-center justify-between py-1 cursor-pointer">
          <span className="text-sm font-medium text-[var(--theme-text-secondary)]">{t('headerStream')}</span>
          <div className="relative">
            <input id="streaming-toggle" type="checkbox" className="sr-only peer" checked={isStreamingEnabled} onChange={() => setIsStreamingEnabled(!isStreamingEnabled)} />
            <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)]"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
          </div>
        </label>
        <label htmlFor="auto-title-toggle" className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
                Auto-generate Chat Titles
                <Tooltip text="Automatically generate a title for new chats after the first exchange using a fast model.">
                    <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
            </span>
            <div className="relative">
                <input id="auto-title-toggle" type="checkbox" className="sr-only peer" checked={isAutoTitleEnabled} onChange={() => setIsAutoTitleEnabled(!isAutoTitleEnabled)} />
                <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)]"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
            </div>
        </label>
        <label htmlFor="use-files-api-for-images-toggle" className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
                {t('settings_useFilesApiForImages_label')}
                <Tooltip text={t('settings_useFilesApiForImages_tooltip')}>
                    <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
            </span>
            <div className="relative">
                <input id="use-files-api-for-images-toggle" type="checkbox" className="sr-only peer" checked={useFilesApiForImages} onChange={() => setUseFilesApiForImages(!useFilesApiForImages)} />
                <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)]"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
            </div>
        </label>
        <label htmlFor="expand-code-blocks-toggle" className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
                {t('settings_expandCodeBlocksByDefault_label')}
            </span>
            <div className="relative">
                <input id="expand-code-blocks-toggle" type="checkbox" className="sr-only peer" checked={expandCodeBlocksByDefault} onChange={() => setExpandCodeBlocksByDefault(!expandCodeBlocksByDefault)} />
                <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)]"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
            </div>
        </label>
      </div>
    </div>
  );
};
