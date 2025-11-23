import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ModelOption } from '../../types';
import { Loader2, Info, Mic, Bot, Brain, Box, Volume2, Image as ImageIcon, Sparkles, Search, X, Check, ChevronDown } from 'lucide-react';
import { AVAILABLE_TTS_VOICES, AVAILABLE_TRANSCRIPTION_MODELS, THINKING_BUDGET_RANGES, THINKING_LEVELS, GEMINI_3_RO_MODELS } from '../../constants/appConstants';
import { Tooltip, Select, Toggle } from './shared/Tooltip';
import { useResponsiveValue } from '../../hooks/useDevice';

interface ModelVoiceSettingsProps {
  modelId: string;
  setModelId: (value: string) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  availableModels: ModelOption[];
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  isTranscriptionThinkingEnabled: boolean;
  setIsTranscriptionThinkingEnabled: (value: boolean) => void;
  useFilesApiForImages: boolean;
  setUseFilesApiForImages: (value: boolean) => void;
  generateQuadImages: boolean;
  setGenerateQuadImages: (value: boolean) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  t: (key: string) => string;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  thinkingLevel?: 'LOW' | 'HIGH';
  setThinkingLevel?: (value: 'LOW' | 'HIGH') => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = ({
  modelId, setModelId, isModelsLoading, modelsLoadingError, availableModels,
  transcriptionModelId, setTranscriptionModelId, isTranscriptionThinkingEnabled, setIsTranscriptionThinkingEnabled,
  useFilesApiForImages, setUseFilesApiForImages,
  generateQuadImages, setGenerateQuadImages,
  ttsVoice, setTtsVoice, 
  systemInstruction, setSystemInstruction,
  thinkingBudget, setThinkingBudget,
  thinkingLevel, setThinkingLevel,
  showThoughts, setShowThoughts,
  t
}) => {
  const iconSize = useResponsiveValue(16, 18);
  const inputBaseClasses = "w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:border-[var(--theme-border-focus)] focus:ring-[var(--theme-border-focus)]/20 text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)]";
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";

  // Thinking logic
  const isGemini3 = GEMINI_3_RO_MODELS.includes(modelId) || modelId.includes('gemini-3-pro');
  const budgetConfig = THINKING_BUDGET_RANGES[modelId];
  const [customBudgetValue, setCustomBudgetValue] = useState(
    thinkingBudget > 0 ? String(thinkingBudget) : '1000'
  );
  const mode = thinkingBudget < 0 ? 'auto' : thinkingBudget === 0 ? 'off' : 'custom';
  const isThinkingOn = isGemini3 ? true : mode !== 'off';

  // Custom Model Selector State
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (thinkingBudget > 0) {
        setCustomBudgetValue(String(thinkingBudget));
    }
  }, [thinkingBudget]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };
    if (isModelSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
        setTimeout(() => setModelSearchQuery(''), 200);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelSelectorOpen]);

  const handleModeChange = (newMode: 'auto' | 'off' | 'custom') => {
      if (newMode === 'auto') setThinkingBudget(-1);
      else if (newMode === 'off') setThinkingBudget(0);
      else {
          if (budgetConfig) {
              setThinkingBudget(budgetConfig.max);
          } else {
              const budget = parseInt(customBudgetValue, 10);
              const newBudget = budget > 0 ? budget : 1000;
              if (String(newBudget) !== customBudgetValue) setCustomBudgetValue(String(newBudget));
              setThinkingBudget(newBudget);
          }
      }
  };

  const handleCustomBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomBudgetValue(val);
      const numVal = parseInt(val, 10);
      if (!isNaN(numVal) && numVal > 0) {
          setThinkingBudget(numVal);
      }
  };

  const getModelIcon = (model: ModelOption) => {
      const { id, isPinned } = model;
      const lowerId = id.toLowerCase();
      if (lowerId.includes('tts')) return <Volume2 size={15} className="text-purple-500 dark:text-purple-400 flex-shrink-0" strokeWidth={1.5} />;
      if (lowerId.includes('imagen') || lowerId.includes('image-')) return <ImageIcon size={15} className="text-rose-500 dark:text-rose-400 flex-shrink-0" strokeWidth={1.5} />;
      if (isPinned) return <Sparkles size={15} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />;
      return <Box size={15} className="text-[var(--theme-text-tertiary)] opacity-70 flex-shrink-0" strokeWidth={1.5} />;
  };

  const filteredModels = useMemo(() => {
    let models = availableModels;
    if (modelSearchQuery.trim()) {
        const query = modelSearchQuery.toLowerCase();
        models = models.filter(model => 
          model.name.toLowerCase().includes(query) || 
          model.id.toLowerCase().includes(query)
        );
    }

    const getCategoryWeight = (id: string) => {
        const lower = id.toLowerCase();
        if (lower.includes('tts')) return 3;
        if (lower.includes('imagen') || lower.includes('image')) return 2;
        return 1;
    };

    return [...models].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isPinned && b.isPinned) {
            const isA3 = a.id.includes('gemini-3');
            const isB3 = b.id.includes('gemini-3');
            if (isA3 && !isB3) return -1;
            if (!isA3 && isB3) return 1;

            const weightA = getCategoryWeight(a.id);
            const weightB = getCategoryWeight(b.id);
            if (weightA !== weightB) return weightA - weightB;
        }
        return a.name.localeCompare(b.name);
    });
  }, [availableModels, modelSearchQuery]);

  const selectedModelOption = availableModels.find(m => m.id === modelId);

  // Only show thinking controls if the model supports it
  const showThinkingControls = !!budgetConfig || isGemini3;

  return (
    <div className="space-y-8">
      {/* Model Selection Group */}
      <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
              <Bot size={14} strokeWidth={1.5} /> Model Selection
          </h4>
          <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-[var(--theme-text-primary)] mb-2">{t('settingsDefaultModel')}</label>
                {isModelsLoading ? (
                <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2.5 w-full">
                    <Loader2 size={iconSize} className="animate-spin mr-2.5 text-[var(--theme-text-link)]" strokeWidth={1.5} />
                    <span>{t('loading')}</span>
                </div>
                ) : modelsLoadingError ? (
                    <div className="text-sm text-[var(--theme-text-danger)] p-2 bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{modelsLoadingError}</div>
                ) : (
                <div className="relative" ref={modelSelectorRef}>
                    <button
                        type="button"
                        onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                        className={`w-full p-2.5 text-left border rounded-lg flex items-center justify-between transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] cursor-pointer bg-[var(--theme-bg-input)] hover:border-[var(--theme-border-focus)] border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-sm`}
                        aria-haspopup="listbox"
                        aria-expanded={isModelSelectorOpen}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            {selectedModelOption ? getModelIcon(selectedModelOption) : <Box size={15} className="text-[var(--theme-text-tertiary)]" />}
                            <span className="truncate font-medium">
                                {selectedModelOption ? selectedModelOption.name : <span className="text-[var(--theme-text-tertiary)]">{t('chatBehavior_model_noModels')}</span>}
                            </span>
                        </div>
                        <ChevronDown size={16} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isModelSelectorOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                    </button>

                    {isModelSelectorOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-50 flex flex-col overflow-hidden modal-enter-animation max-h-[300px]">
                            <div className="px-2 py-2 border-b border-[var(--theme-border-secondary)] sticky top-0 bg-[var(--theme-bg-secondary)] z-10">
                                <div className="flex items-center gap-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-[var(--theme-border-focus)]">
                                    <Search size={14} className="text-[var(--theme-text-tertiary)]" />
                                    <input 
                                        ref={searchInputRef}
                                        type="text"
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] min-w-0"
                                        placeholder={t('header_model_search_placeholder' as any) || "Search..."}
                                        value={modelSearchQuery}
                                        onChange={(e) => setModelSearchQuery(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {modelSearchQuery && (
                                        <button onClick={(e) => { e.stopPropagation(); setModelSearchQuery(''); searchInputRef.current?.focus(); }} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar p-1" role="listbox">
                                {filteredModels.length > 0 ? (
                                    filteredModels.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => { setModelId(model.id); setIsModelSelectorOpen(false); }}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${
                                                model.id === modelId
                                                ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                            }`}
                                            role="option"
                                            aria-selected={model.id === modelId}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {getModelIcon(model)}
                                                <span className="truncate">{model.name}</span>
                                            </div>
                                            {model.id === modelId && <Check size={14} className="text-[var(--theme-text-link)] flex-shrink-0 ml-2" strokeWidth={1.5} />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)]">
                                        No models found
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Thinking Controls */}
            {showThinkingControls && (
                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center gap-2">
                            {t('settingsThinkingMode')}
                            <Tooltip text={t('settingsThinkingMode_tooltip')}>
                                <Info size={14} className="text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                            </Tooltip>
                        </label>
                    </div>
                    
                    <div role="radiogroup" className="flex gap-2 bg-[var(--theme-bg-tertiary)]/50 p-1 rounded-lg border border-[var(--theme-border-secondary)]">
                        <button
                            role="radio"
                            aria-checked={mode === 'auto'}
                            onClick={() => handleModeChange('auto')}
                            className={`flex-1 text-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                                mode === 'auto'
                                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                            }`}
                        >
                            {isGemini3 ? t('settingsThinkingMode_preset') : t('settingsThinkingMode_auto')}
                        </button>

                        {!isGemini3 && (
                             <button
                                role="radio"
                                aria-checked={mode === 'off'}
                                onClick={() => handleModeChange('off')}
                                className={`flex-1 text-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                                    mode === 'off'
                                    ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                                    : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                                }`}
                            >
                                {t('settingsThinkingMode_off')}
                            </button>
                        )}

                        <button
                            role="radio"
                            aria-checked={mode === 'custom'}
                            onClick={() => handleModeChange('custom')}
                            className={`flex-1 text-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                                mode === 'custom'
                                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                            }`}
                        >
                            {t('settingsThinkingMode_custom')}
                        </button>
                    </div>
                    
                    {/* Gemini 3 Thinking Level (Preset Mode) */}
                    {isGemini3 && mode === 'auto' && (
                        <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                             <Select
                                id="thinking-level-select"
                                label=""
                                labelContent={<span className='flex items-center text-xs font-medium text-[var(--theme-text-secondary)]'>{t('settingsThinkingLevel')}</span>}
                                value={thinkingLevel}
                                onChange={(e) => setThinkingLevel && setThinkingLevel(e.target.value as 'LOW' | 'HIGH')}
                            >
                                {THINKING_LEVELS.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
                            </Select>
                        </div>
                    )}

                    {/* Thinking Budget (Custom Mode) */}
                    {mode === 'custom' && (
                        <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {budgetConfig ? (
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label htmlFor="thinking-budget-slider" className="text-xs font-medium text-[var(--theme-text-secondary)]">
                                            {t('settingsThinkingBudget')}
                                        </label>
                                        <span className="text-xs font-mono text-[var(--theme-text-link)]">{thinkingBudget > 0 ? thinkingBudget.toLocaleString() : '...'}</span>
                                    </div>
                                    <input
                                        id="thinking-budget-slider"
                                        type="range"
                                        min={budgetConfig.min}
                                        max={budgetConfig.max}
                                        step={1}
                                        value={thinkingBudget > 0 ? thinkingBudget : budgetConfig.min}
                                        onChange={(e) => setThinkingBudget(parseInt(e.target.value, 10))}
                                        className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
                                    />
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    value={customBudgetValue}
                                    onChange={handleCustomBudgetChange}
                                    placeholder={t('settingsThinkingCustom_placeholder')}
                                    className={`${inputBaseClasses} ${enabledInputClasses} w-full font-mono`}
                                    min="1"
                                    step="100"
                                />
                            )}
                        </div>
                    )}

                    <div className={`flex justify-between items-center pt-2 transition-opacity duration-300 ${isThinkingOn ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <label className="text-sm text-[var(--theme-text-primary)] flex items-center">
                            {t('settingsShowThoughts')}
                            <Tooltip text={t('settingsShowThoughts_tooltip')}>
                                <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                            </Tooltip>
                        </label>
                        <Toggle id="show-thoughts-toggle" checked={showThoughts && isThinkingOn} onChange={setShowThoughts} disabled={!isThinkingOn} />
                    </div>
                </div>
            )}

            <div className={`pt-2 ${showThinkingControls ? 'border-t border-[var(--theme-border-secondary)]/50' : ''}`}>
                <label htmlFor="system-prompt-input" className="block text-sm font-medium text-[var(--theme-text-primary)] mb-2 flex items-center justify-between">
                    <span>{t('settingsSystemPrompt')}</span>
                    {isSystemPromptSet && <span className="w-2 h-2 bg-[var(--theme-text-success)] rounded-full animate-pulse" title="Active" />}
                </label>
                <textarea
                  id="system-prompt-input" value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)}
                  rows={3} className={`${inputBaseClasses} ${enabledInputClasses} resize-y min-h-[80px] custom-scrollbar`}
                  placeholder={t('chatBehavior_systemPrompt_placeholder')}
                  aria-label="System prompt text area"
                />
            </div>
            
            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[var(--theme-border-secondary)]/50">
                 <label htmlFor="use-files-api-toggle" className="flex items-center justify-between py-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)]/50 transition-colors cursor-pointer px-1">
                    <span className="text-sm text-[var(--theme-text-secondary)] flex items-center">
                    {t('settings_useFilesApiForImages_label')}
                    <Tooltip text={t('settings_useFilesApiForImages_tooltip')}>
                        <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                    </span>
                    <Toggle id="use-files-api-toggle" checked={useFilesApiForImages} onChange={setUseFilesApiForImages} />
                </label>
                <label htmlFor="quad-image-toggle" className="flex items-center justify-between py-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)]/50 transition-colors cursor-pointer px-1">
                    <span className="text-sm text-[var(--theme-text-secondary)] flex items-center">
                    {t('settings_generateQuadImages_label')}
                    <Tooltip text={t('settings_generateQuadImages_tooltip')}>
                        <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                    </span>
                    <Toggle id="quad-image-toggle" checked={generateQuadImages} onChange={setGenerateQuadImages} />
                </label>
            </div>
          </div>
      </div>

      {/* Voice & Audio Group */}
      <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
              <Mic size={14} strokeWidth={1.5} /> Audio & Speech
          </h4>
          
          <div className="space-y-5">
              <Select
                id="transcription-model-select"
                label=""
                labelContent={
                  <span className='flex items-center text-sm font-medium text-[var(--theme-text-primary)]'>
                     {t('chatBehavior_voiceModel_label')}
                    <Tooltip text={t('chatBehavior_voiceModel_tooltip')}>
                      <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                  </span>
                }
                value={transcriptionModelId}
                onChange={(e) => setTranscriptionModelId(e.target.value)}
              >
                {AVAILABLE_TRANSCRIPTION_MODELS.map((model) => ( <option key={model.id} value={model.id}>{model.name}</option>))}
              </Select>

              <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
                   <label htmlFor="transcription-thinking-toggle" className="flex items-center justify-between py-2 cursor-pointer">
                    <span className="text-sm text-[var(--theme-text-secondary)] flex items-center">
                      {t('settingsTranscriptionThinking')}
                      <Tooltip text={t('chatBehavior_transcriptionThinking_tooltip')}>
                        <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                      </Tooltip>
                    </span>
                    <Toggle id="transcription-thinking-toggle" checked={isTranscriptionThinkingEnabled} onChange={setIsTranscriptionThinkingEnabled} />
                  </label>
              </div>

              <Select
                id="tts-voice-select"
                label=""
                labelContent={
                  <span className="flex items-center text-sm font-medium text-[var(--theme-text-primary)]">
                    {t('settingsTtsVoice')}
                  </span>
                }
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
              >
                {AVAILABLE_TTS_VOICES.map((voice) => ( <option key={voice.id} value={voice.id}>{voice.name}</option> ))}
              </Select>
          </div>
      </div>
    </div>
  );
};