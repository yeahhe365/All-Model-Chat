
import React, { useState } from 'react';
import { KeyRound, Info, Check, AlertCircle } from 'lucide-react';
import { Toggle } from '../shared/Tooltip';
import { useResponsiveValue } from '../../hooks/useDevice';
import { SETTINGS_INPUT_CLASS } from '../../constants/appConstants';

interface ApiConfigSectionProps {
  useCustomApiConfig: boolean;
  setUseCustomApiConfig: (value: boolean) => void;
  apiKey: string | null;
  setApiKey: (value: string | null) => void;
  apiProxyUrl: string | null;
  setApiProxyUrl: (value: string | null) => void;
  useApiProxy: boolean;
  setUseApiProxy: (value: boolean) => void;
  t: (key: string) => string;
}

export const ApiConfigSection: React.FC<ApiConfigSectionProps> = ({
  useCustomApiConfig,
  setUseCustomApiConfig,
  apiKey,
  setApiKey,
  apiProxyUrl,
  setApiProxyUrl,
  useApiProxy,
  setUseApiProxy,
  t,
}) => {
  const [isApiKeyFocused, setIsApiKeyFocused] = useState(false);

  const inputBaseClasses = "w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm custom-scrollbar font-mono";
  const iconSize = useResponsiveValue(18, 20);

  // Visual blur effect for API key when not focused
  const apiKeyBlurClass = !isApiKeyFocused && useCustomApiConfig && apiKey ? 'text-transparent [text-shadow:0_0_6px_var(--theme-text-primary)] tracking-widest' : '';

  const getProxyPlaceholder = () => {
    if (!useCustomApiConfig) return 'Enable custom config first';
    if (!useApiProxy) return 'Enable proxy URL to set value';
    return 'e.g., https://my-proxy.com/v1beta';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h3 className="text-base font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
             <KeyRound size={iconSize} className="text-[var(--theme-text-link)]" strokeWidth={1.5} />
             {t('settingsApiConfig')}
         </h3>
      </div>

      <div className="overflow-hidden">
        {/* Header Toggle */}
        <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => setUseCustomApiConfig(!useCustomApiConfig)}>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--theme-text-primary)]">
                  {t('settingsUseCustomApi')}
                </span>
                <span className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
                    {useCustomApiConfig ? 'Using your own API keys' : t('apiConfig_default_info')}
                </span>
            </div>
            <Toggle
              id="use-custom-api-config-toggle"
              checked={useCustomApiConfig}
              onChange={setUseCustomApiConfig}
            />
        </div>

        {/* Content */}
        <div className={`transition-all duration-300 ease-in-out ${useCustomApiConfig ? 'opacity-100 max-h-[500px] pt-4' : 'opacity-50 max-h-0 overflow-hidden'}`}>
            <div className="space-y-5">
                {/* API Key Input */}
                <div className="space-y-2">
                    <label htmlFor="api-key-input" className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                        {t('settingsApiKey')}
                    </label>
                    <div className="relative">
                        <textarea
                          id="api-key-input"
                          rows={3}
                          value={apiKey || ''}
                          onChange={(e) => setApiKey(e.target.value || null)}
                          onFocus={() => setIsApiKeyFocused(true)}
                          onBlur={() => setIsApiKeyFocused(false)}
                          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-y min-h-[80px] ${apiKeyBlurClass}`}
                          placeholder={t('apiConfig_key_placeholder')}
                          spellCheck={false}
                        />
                        {!isApiKeyFocused && apiKey && (
                            <div className="absolute top-3 right-3 pointer-events-none">
                                <Check size={16} className="text-[var(--theme-text-success)]" strokeWidth={1.5} />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-[var(--theme-text-tertiary)] flex gap-1.5">
                        <Info size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <span>{t('settingsApiKeyHelpText')}</span>
                    </p>
                </div>

                {/* Proxy Settings */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between py-2">
                        <label htmlFor="use-api-proxy-toggle" className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] cursor-pointer flex items-center gap-2" onClick={() => setUseApiProxy(!useApiProxy)}>
                            API Proxy
                        </label>
                        <Toggle
                          id="use-api-proxy-toggle"
                          checked={useApiProxy}
                          onChange={setUseApiProxy}
                        />
                    </div>
                    
                    <div className={`transition-all duration-200 ${useApiProxy ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <input
                            id="api-proxy-url-input"
                            type="text"
                            value={apiProxyUrl || ''}
                            onChange={(e) => setApiProxyUrl(e.target.value || null)}
                            className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                            placeholder={getProxyPlaceholder()}
                            aria-label="API Proxy URL"
                        />
                         <p className="text-xs text-[var(--theme-text-tertiary)] mt-2 flex gap-1.5">
                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                            <span>Overwrites <code>https://generativelanguage.googleapis.com/v1beta</code> base URL.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
