
import React, { useState } from 'react';
import { KeyRound, Info, Check, AlertCircle, ShieldCheck, ArrowRight, Activity, Loader2, XCircle } from 'lucide-react';
import { Toggle } from '../shared/Tooltip';
import { useResponsiveValue } from '../../hooks/useDevice';
import { SETTINGS_INPUT_CLASS } from '../../constants/appConstants';
import { getClient } from '../../services/api/baseApi';

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
  
  // Test connection state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

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

  const handleTestConnection = async () => {
      // Pick the key that would be used
      let keyToTest = apiKey;
      
      // If custom config is OFF, or ON but no key provided, we might fall back to env key if available.
      // But for explicit testing, if custom config is ON, we should test what's in the box.
      if (!useCustomApiConfig && hasEnvKey) {
          keyToTest = process.env.API_KEY || null;
      }
      
      if (useCustomApiConfig && !keyToTest) {
          setTestStatus('error');
          setTestMessage("No API Key provided to test.");
          return;
      }

      if (!keyToTest) {
           setTestStatus('error');
           setTestMessage("No API Key available.");
           return;
      }

      // Handle multiple keys - pick first for test
      const firstKey = keyToTest.split('\n')[0].trim().replace(/^["']|["']$/g, '');
      const effectiveUrl = (useCustomApiConfig && useApiProxy && apiProxyUrl) ? apiProxyUrl : null;

      setTestStatus('testing');
      setTestMessage(null);

      try {
          // Use the base API helper to get a client with sanitation logic
          const ai = getClient(firstKey, effectiveUrl);
          
          // Using gemini-2.5-flash for a quick, cheap test
          await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: 'Hello',
          });

          setTestStatus('success');
      } catch (error) {
          setTestStatus('error');
          setTestMessage(error instanceof Error ? error.message : String(error));
      }
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
        <div className={`transition-all duration-300 ease-in-out ${useCustomApiConfig ? 'opacity-100 max-h-[600px] pt-4' : 'opacity-50 max-h-0 overflow-hidden'}`}>
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
                          onChange={(e) => {
                              setApiKey(e.target.value || null);
                              setTestStatus('idle'); // Reset test status on edit
                          }}
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
                          onChange={(val) => {
                              setUseApiProxy(val);
                              setTestStatus('idle');
                          }}
                        />
                    </div>
                    
                    <div className={`transition-all duration-200 ${useApiProxy ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <input
                            id="api-proxy-url-input"
                            type="text"
                            value={apiProxyUrl || ''}
                            onChange={(e) => {
                                setApiProxyUrl(e.target.value || null);
                                setTestStatus('idle');
                            }}
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

                {/* Test Connection Button */}
                <div className="pt-2 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testStatus === 'testing' || (!apiKey && useCustomApiConfig)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                            testStatus === 'testing' 
                                ? 'bg-[var(--theme-bg-tertiary)] border-transparent cursor-wait'
                                : 'bg-transparent border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {testStatus === 'testing' ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Activity size={16} strokeWidth={1.5} />
                        )}
                        <span>{testStatus === 'testing' ? t('apiConfig_testing') : t('apiConfig_testConnection')}</span>
                    </button>

                    {/* Test Results */}
                    {testStatus === 'success' && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm animate-in fade-in slide-in-from-top-1">
                            <CheckCircleIcon />
                            <span>{t('apiConfig_testSuccess')}</span>
                        </div>
                    )}
                    {testStatus === 'error' && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm animate-in fade-in slide-in-from-top-1">
                            <XCircle size={16} className="flex-shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                                <span className="font-medium">{t('apiConfig_testFailed')}</span>
                                {testMessage && <span className="text-xs opacity-90 break-all">{testMessage}</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const CheckCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);
