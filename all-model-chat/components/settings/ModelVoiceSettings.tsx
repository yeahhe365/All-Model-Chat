import React, { useState, useEffect } from 'react';
import { ModelOption } from '../../types';
import { Loader2, Info, Mic } from 'lucide-react';
import { AVAILABLE_TRANSCRIPTION_MODELS } from '../../constants/appConstants';
import { getResponsiveValue } from '../../utils/appUtils';
import { Tooltip } from './shared/Tooltip';
import { Select } from './shared/Tooltip';

const Toggle: React.FC<{
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ id, checked, onChange, disabled }) => (
  <label htmlFor={id} className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
    <div className="relative">
      <input id={id} type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <div className="w-11 h-6 bg-[var(--theme-bg-tertiary)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out border border-[var(--theme-border-secondary)] peer-checked:border-transparent"></div>
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
    </div>
  </label>
);

interface ModelVoiceSettingsProps {
  modelId: string;
  setModelId: (value: string) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  availableModels: ModelOption[];
  toolbarModelId: string;
  setToolbarModelId: (value: string) => void;
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  isToolbarActionsThinkingEnabled: boolean;
  setIsToolbarActionsThinkingEnabled: (value: boolean) => void;
  isTranscriptionThinkingEnabled: boolean;
  setIsTranscriptionThinkingEnabled: (value: boolean) => void;
  t: (key: string) => string;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = ({
  modelId, setModelId, isModelsLoading, modelsLoadingError, availableModels,
  toolbarModelId, setToolbarModelId,
  transcriptionModelId, setTranscriptionModelId,
  thinkingBudget, setThinkingBudget,
  showThoughts, setShowThoughts,
  isToolbarActionsThinkingEnabled, setIsToolbarActionsThinkingEnabled,
  isTranscriptionThinkingEnabled, setIsTranscriptionThinkingEnabled,
  t
}) => {
  const iconSize = getResponsiveValue(14, 16);
  const [customBudgetValue, setCustomBudgetValue] = useState(
    thinkingBudget > 0 ? String(thinkingBudget) : '1000'
  );
  const mode = thinkingBudget < 0 ? 'auto' : thinkingBudget === 0 ? 'off' : 'custom';
  const isThinkingOn = mode !== 'off';
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";

  const handleModeChange = (newMode: 'auto' | 'off' | 'custom') => {
      if (newMode === 'auto') setThinkingBudget(-1);
      else if (newMode === 'off') setThinkingBudget(0);
      else {
          const budget = parseInt(customBudgetValue, 10);
          const newBudget = budget > 0 ? budget : 1000;
          if (String(newBudget) !== customBudgetValue) setCustomBudgetValue(String(newBudget));
          setThinkingBudget(newBudget);
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
  
  useEffect(() => {
    if (thinkingBudget > 0) {
        setCustomBudgetValue(String(thinkingBudget));
    }
  }, [thinkingBudget]);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-[var(--theme-text-primary)] mb-3">{t('settings_section_model_config')}</h4>
        <div className="space-y-4">
          <div>
            <label htmlFor="model-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsDefaultModel')}</label>
            {isModelsLoading ? (
              <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2 w-full">
                <Loader2 size={iconSize} className="animate-spin mr-2.5 text-[var(--theme-text-link)]" />
                <span>{t('loading')}</span>
              </div>
            ) : modelsLoadingError ? (
                <div className="text-sm text-[var(--theme-text-danger)] p-2 bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{modelsLoadingError}</div>
            ) : (
              <Select
                id="model-select"
                label="" // Label is provided externally
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={availableModels.length === 0}
                aria-label="Select AI Model for current or new chats"
              >
                {availableModels.map((model) => ( <option key={model.id} value={model.id}>{model.isPinned ? '📌 ' : ''}{model.name}</option> ))}
                {availableModels.length === 0 && <option value="" disabled>{t('chatBehavior_model_noModels')}</option>}
              </Select>
            )}
          </div>

          <div>
            <label htmlFor="toolbar-model-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
              {t('settings_toolbarModel_label')}
              <Tooltip text={t('settings_toolbarModel_tooltip')}>
                <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
              </Tooltip>
            </label>
            <Select
              id="toolbar-model-select"
              label=""
              value={toolbarModelId}
              onChange={(e) => setToolbarModelId(e.target.value)}
              aria-label="Select AI Model for the floating toolbar actions"
            >
              {AVAILABLE_TRANSCRIPTION_MODELS.map((model) => ( <option key={model.id} value={model.id}>{model.name}</option>))}
            </Select>
          </div>
          <Select
            id="transcription-model-select"
            label=""
            labelContent={
              <span className='flex items-center'>
                <Mic size={iconSize-2} className="mr-2" /> {t('chatBehavior_voiceModel_label')}
                <Tooltip text={t('chatBehavior_voiceModel_tooltip')}>
                  <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
              </span>
            }
            value={transcriptionModelId}
            onChange={(e) => setTranscriptionModelId(e.target.value)}
            aria-label="Select AI Model for voice input transcription"
          >
            {AVAILABLE_TRANSCRIPTION_MODELS.map((model) => ( <option key={model.id} value={model.id}>{model.name}</option>))}
          </Select>
        </div>
      </div>
      
      <div className="pt-6 border-t border-[var(--theme-border-secondary)]">
        <h4 className="text-base font-semibold text-[var(--theme-text-primary)] mb-3">{t('settings_section_thinking')}</h4>
         <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-2 flex items-center">
                  {t('settingsThinkingMode')}
                  <Tooltip text={t('settingsThinkingMode_tooltip')}>
                      <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                  </Tooltip>
              </label>
              <div role="radiogroup" className="flex bg-[var(--theme-bg-tertiary)] p-0.5 rounded-lg">
                  {(['auto', 'off', 'custom'] as const).map(modeValue => (
                    <button
                      key={modeValue}
                      role="radio"
                      aria-checked={mode === modeValue}
                      onClick={() => handleModeChange(modeValue)}
                      className={`flex-1 text-center px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-focus)] ${
                          mode === modeValue
                          ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                          : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)]/50'
                      }`}
                    >
                      {t(`settingsThinkingMode_${modeValue}`)}
                    </button>
                  ))}
              </div>
              {mode === 'custom' && (
                  <div className="mt-2" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
                      <input
                          type="number"
                          value={customBudgetValue}
                          onChange={handleCustomBudgetChange}
                          placeholder={t('settingsThinkingCustom_placeholder')}
                          className={`${inputBaseClasses} ${enabledInputClasses} w-full`}
                          aria-label="Custom thinking token budget"
                          min="1"
                          step="100"
                      />
                  </div>
              )}
            </div>
            <div className={`flex justify-between items-center py-2 transition-opacity ${isThinkingOn ? 'opacity-100' : 'opacity-50'}`}>
              <label className={`text-sm flex items-center ${isThinkingOn ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)]'}`}>
                  {t('settingsShowThoughts')}
                  <Tooltip text={t('settingsShowThoughts_tooltip')}>
                      <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                  </Tooltip>
              </label>
              <Toggle id="show-thoughts-toggle" checked={showThoughts && isThinkingOn} onChange={setShowThoughts} disabled={!isThinkingOn} />
            </div>
            <label htmlFor="toolbar-thinking-toggle" className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
                {t('settingsToolbarActionsThinking_label')}
                <Tooltip text={t('settingsToolbarActionsThinking_tooltip')}>
                  <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
              </span>
              <Toggle id="toolbar-thinking-toggle" checked={isToolbarActionsThinkingEnabled} onChange={setIsToolbarActionsThinkingEnabled} />
            </label>
             <label htmlFor="transcription-thinking-toggle" className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
                {t('settingsTranscriptionThinking')}
                <Tooltip text={t('chatBehavior_transcriptionThinking_tooltip')}>
                  <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
              </span>
              <Toggle id="transcription-thinking-toggle" checked={isTranscriptionThinkingEnabled} onChange={setIsTranscriptionThinkingEnabled} />
            </label>
         </div>
      </div>
    </div>
  );
};