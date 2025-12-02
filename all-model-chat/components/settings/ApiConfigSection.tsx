
import React, { useState } from 'react';
import { KeyRound, Info, Check, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
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

  const hasEnvKey = !!process.env.API_KEY;

  // Calculate preview URL
  const defaultBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  const currentBaseUrl = apiProxyUrl?.trim() || defaultBaseUrl;
  const cleanBaseUrl = currentBaseUrl.replace(/\/+$/, '');
  const previewUrl = `${cleanBaseUrl}/models/gemini-2.5-flash:generateContent`;

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
        <div className="flex items-center justify-between py-2">
            <div className="flex flex-col flex-grow cursor-pointer" onClick={() => setUseCustomApiConfig(!useCustomApiConfig)}>
                <span className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center gap-2">
                  {t('settingsUseCustomApi')}
                  {hasEnvKey && !useCustomApiConfig && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                          <ShieldCheck size={10} /> Env Key Active
                      </span>
                  )}
                </span>
                <span className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
                    {useCustomApiConfig 
                        ? (hasEnvKey ? 'Overriding environment API key' : 'Using your own API keys')
                        : (hasEnvKey ? t('apiConfig_default_info') : 'No API key found in environment. Enable custom key to proceed.')
                    }
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
                        <label htmlFor="use-api-proxy-toggle" className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] cursor-pointer flex items-center gap-2">
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
                        
                        <div className="mt-3 p-3 rounded-lg bg-[var(--theme-bg-tertiary)]/30 border border-[var(--theme-border-secondary)]">
                            <div className="flex gap-2 text-xs text-[var(--theme-text-tertiary)] mb-1.5">
                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                                <span>Preview of actual request URL:</span>
                            </div>
                            <div className="flex items-start gap-2 pl-5">
                                <ArrowRight size={12} className="mt-1 text-[var(--theme-text-tertiary)]" />
                                <code className="font-mono text-[11px] text-[var(--theme-text-primary)] break-all leading-relaxed">
                                    {previewUrl}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
