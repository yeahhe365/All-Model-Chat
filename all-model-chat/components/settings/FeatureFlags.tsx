import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from './shared/Tooltip';

interface FeatureFlagsProps {
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  isStreamingEnabled: boolean;
  setIsStreamingEnabled: (value: boolean) => void;
  useFilesApiForImages: boolean;
  setUseFilesApiForImages: (value: boolean) => void;
  expandCodeBlocksByDefault: boolean;
  setExpandCodeBlocksByDefault: (value: boolean) => void;
  isAutoTitleEnabled: boolean;
  setIsAutoTitleEnabled: (value: boolean) => void;
  isMermaidRenderingEnabled: boolean;
  setIsMermaidRenderingEnabled: (value: boolean) => void;
  isGraphvizRenderingEnabled: boolean;
  setIsGraphvizRenderingEnabled: (value: boolean) => void;
  isCompletionNotificationEnabled: boolean;
  setIsCompletionNotificationEnabled: (value: boolean) => void;
  isSuggestionsEnabled: boolean;
  setIsSuggestionsEnabled: (value: boolean) => void;
  t: (key: string) => string;
}

const Toggle: React.FC<{
  id: string;
  labelKey: string;
  tooltipKey?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  t: (key: string) => string;
}> = ({ id, labelKey, tooltipKey, checked, onChange, t }) => (
  <label htmlFor={id} className="flex items-center justify-between py-1 cursor-pointer">
    <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
      {t(labelKey)}
      {tooltipKey && (
        <Tooltip text={t(tooltipKey)}>
          <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
        </Tooltip>
      )}
    </span>
    <div className="relative">
      <input id={id} type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-11 h-6 bg-[var(--theme-bg-tertiary)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out border border-[var(--theme-border-secondary)] peer-checked:border-transparent"></div>
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
    </div>
  </label>
);


export const FeatureFlags: React.FC<FeatureFlagsProps> = ({
  showThoughts, setShowThoughts, thinkingBudget, setThinkingBudget,
  isStreamingEnabled, setIsStreamingEnabled, useFilesApiForImages, setUseFilesApiForImages,
  expandCodeBlocksByDefault, setExpandCodeBlocksByDefault, isAutoTitleEnabled, setIsAutoTitleEnabled,
  isMermaidRenderingEnabled, setIsMermaidRenderingEnabled, isGraphvizRenderingEnabled, setIsGraphvizRenderingEnabled,
  isCompletionNotificationEnabled, setIsCompletionNotificationEnabled, isSuggestionsEnabled, setIsSuggestionsEnabled, t
}) => {
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  
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
    <div className="space-y-2">
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
            } focus:z-10 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] transition-colors -ml-px`}
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
      
      <Toggle id="streaming-toggle" labelKey="headerStream" checked={isStreamingEnabled} onChange={setIsStreamingEnabled} t={t} />
      <Toggle id="auto-title-toggle" labelKey="isAutoTitleEnabled" tooltipKey="isAutoTitleEnabled_tooltip" checked={isAutoTitleEnabled} onChange={setIsAutoTitleEnabled} t={t} />
      <Toggle id="use-files-api-for-images-toggle" labelKey="settings_useFilesApiForImages_label" tooltipKey="settings_useFilesApiForImages_tooltip" checked={useFilesApiForImages} onChange={setUseFilesApiForImages} t={t} />
      <Toggle id="expand-code-blocks-toggle" labelKey="settings_expandCodeBlocksByDefault_label" checked={expandCodeBlocksByDefault} onChange={setExpandCodeBlocksByDefault} t={t} />
      <Toggle id="mermaid-rendering-toggle" labelKey="settings_enableMermaidRendering_label" tooltipKey="settings_enableMermaidRendering_tooltip" checked={isMermaidRenderingEnabled} onChange={setIsMermaidRenderingEnabled} t={t} />
      <Toggle id="graphviz-rendering-toggle" labelKey="settings_enableGraphvizRendering_label" tooltipKey="settings_enableGraphvizRendering_tooltip" checked={isGraphvizRenderingEnabled} onChange={setIsGraphvizRenderingEnabled} t={t} />
      <Toggle id="completion-notification-toggle" labelKey="settings_enableCompletionNotification_label" tooltipKey="settings_enableCompletionNotification_tooltip" checked={isCompletionNotificationEnabled} onChange={setIsCompletionNotificationEnabled} t={t} />
      <Toggle id="suggestions-toggle" labelKey="settings_enableSuggestions_label" tooltipKey="settings_enableSuggestions_tooltip" checked={isSuggestionsEnabled} onChange={setIsSuggestionsEnabled} t={t} />
    </div>
  );
};