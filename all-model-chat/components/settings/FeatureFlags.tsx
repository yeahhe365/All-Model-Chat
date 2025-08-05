import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from './shared/Tooltip';

interface FeatureFlagsProps {
  isStreamingEnabled: boolean;
  setIsStreamingEnabled: (value: boolean) => void;
  isAutoTitleEnabled: boolean;
  setIsAutoTitleEnabled: (value: boolean) => void;
  isSuggestionsEnabled: boolean;
  setIsSuggestionsEnabled: (value: boolean) => void;
  isAutoSendOnSuggestionClick: boolean;
  setIsAutoSendOnSuggestionClick: (value: boolean) => void;
  t: (key: string) => string;
}

const Toggle: React.FC<{
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, checked, onChange }) => (
  <label htmlFor={id} className="flex items-center cursor-pointer">
    <div className="relative">
      <input id={id} type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-11 h-6 bg-[var(--theme-bg-tertiary)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out border border-[var(--theme-border-secondary)] peer-checked:border-transparent"></div>
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
    </div>
  </label>
);


export const FeatureFlags: React.FC<FeatureFlagsProps> = ({
  isStreamingEnabled, setIsStreamingEnabled,
  isAutoTitleEnabled, setIsAutoTitleEnabled,
  isSuggestionsEnabled, setIsSuggestionsEnabled,
  isAutoSendOnSuggestionClick, setIsAutoSendOnSuggestionClick,
  t
}) => {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
        Conversation
      </h3>
      <SettingsRow label={t('headerStream')}>
         <Toggle id="streaming-toggle" checked={isStreamingEnabled} onChange={setIsStreamingEnabled} />
      </SettingsRow>
      <SettingsRow label={t('isAutoTitleEnabled')}>
          <Toggle id="auto-title-toggle" checked={isAutoTitleEnabled} onChange={setIsAutoTitleEnabled} />
      </SettingsRow>
       <SettingsRow label={t('settings_enableSuggestions_label')}>
          <Toggle id="suggestions-toggle" checked={isSuggestionsEnabled} onChange={setIsSuggestionsEnabled} />
      </SettingsRow>

      {isSuggestionsEnabled && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <SettingsRow label={t('settings_autoSendOnSuggestionClick_label')}>
             <Toggle id="auto-send-suggestions-toggle" checked={isAutoSendOnSuggestionClick} onChange={setIsAutoSendOnSuggestionClick} />
          </SettingsRow>
        </div>
      )}
    </div>
  );
};

// Helper inside FeatureFlags
const SettingsRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-sm text-[var(--theme-text-primary)]">{label}</span>
    <div>{children}</div>
  </div>
);