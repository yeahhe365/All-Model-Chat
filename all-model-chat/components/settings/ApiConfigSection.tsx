import React, { useState } from 'react';
import { KeyRound, Info } from 'lucide-react';
import { getResponsiveValue } from '../../utils/appUtils';

interface ApiConfigSectionProps {
  useCustomApiConfig: boolean;
  setUseCustomApiConfig: (value: boolean) => void;
  apiKey: string | null;
  setApiKey: (value: string | null) => void;
  apiProxyUrl: string | null;
  setApiProxyUrl: (value: string | null) => void;
  t: (key: string) => string;
}

export const ApiConfigSection: React.FC<ApiConfigSectionProps> = ({
  useCustomApiConfig,
  setUseCustomApiConfig,
  apiKey,
  setApiKey,
  apiProxyUrl,
  setApiProxyUrl,
  t,
}) => {
  const [isApiKeyFocused, setIsApiKeyFocused] = useState(false);

  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm custom-scrollbar";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const disabledInputClasses = "bg-[var(--theme-bg-secondary)] border-[var(--theme-border-primary)] opacity-60 cursor-not-allowed";
  const iconSize = getResponsiveValue(14, 16);

  const apiKeyBlurClass = !isApiKeyFocused && useCustomApiConfig && apiKey ? 'text-transparent [text-shadow:0_0_5px_var(--theme-text-primary)]' : '';

  return (
    <div className="space-y-3 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-2">
        <KeyRound size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsApiConfig')}
      </h3>

      <label htmlFor="use-custom-api-config-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)]">
          {t('settingsUseCustomApi')}
        </span>
        <div className="relative">
          <input
            id="use-custom-api-config-toggle"
            type="checkbox"
            className="sr-only peer"
            checked={useCustomApiConfig}
            onChange={() => setUseCustomApiConfig(!useCustomApiConfig)}
          />
          <div className="w-11 h-6 bg-[var(--theme-bg-tertiary)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out border border-[var(--theme-border-secondary)] peer-checked:border-transparent"></div>
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
        </div>
      </label>

      {!useCustomApiConfig && (
        <p className="text-xs text-[var(--theme-text-tertiary)] flex items-center bg-[var(--theme-bg-info)] bg-opacity-30 p-2 rounded-md border border-[var(--theme-border-secondary)]">
          <Info size={14} className="mr-2 flex-shrink-0 text-[var(--theme-text-info)]" />
          {t('apiConfig_default_info')}
        </p>
      )}

      <div className={`space-y-4 ${!useCustomApiConfig ? 'opacity-50' : ''}`}>
        <div>
            <label htmlFor="api-key-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsApiKey')}</label>
            <textarea
              id="api-key-input"
              rows={3}
              value={apiKey || ''}
              onChange={(e) => setApiKey(e.target.value || null)}
              onFocus={() => setIsApiKeyFocused(true)}
              onBlur={() => setIsApiKeyFocused(false)}
              className={`${inputBaseClasses} ${useCustomApiConfig ? enabledInputClasses : disabledInputClasses} resize-y min-h-[60px] transition-all duration-200 ease-in-out ${apiKeyBlurClass}`}
              placeholder={useCustomApiConfig ? t('apiConfig_key_placeholder') : t('apiConfig_key_placeholder_disabled')}
              aria-label="Gemini API Key input"
              disabled={!useCustomApiConfig}
            />
            {useCustomApiConfig && (
              <p className="text-xs text-[var(--theme-text-tertiary)] mt-1.5">
                {t('settingsApiKeyHelpText')}
              </p>
            )}
        </div>
        <div>
          <label htmlFor="api-proxy-url-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">API Proxy URL (optional)</label>
          <input
            id="api-proxy-url-input"
            type="text"
            value={apiProxyUrl || ''}
            onChange={(e) => setApiProxyUrl(e.target.value || null)}
            className={`${inputBaseClasses} ${useCustomApiConfig ? enabledInputClasses : disabledInputClasses}`}
            placeholder={useCustomApiConfig ? 'e.g., http://localhost:3000/v1beta' : 'Enable custom config to set proxy'}
            aria-label="API Proxy URL"
            disabled={!useCustomApiConfig}
          />
          {useCustomApiConfig && (
            <p className="text-xs text-[var(--theme-text-tertiary)] mt-1.5">
              Replaces <code>https://generativelanguage.googleapis.com/v1beta</code> for API calls.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
