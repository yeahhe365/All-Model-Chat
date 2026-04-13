
import React, { useState, useEffect, useRef } from 'react';
import { KeyRound } from 'lucide-react';
import { useResponsiveValue } from '../../../hooks/useDevice';
import { SETTINGS_INPUT_CLASS } from '../../../constants/appConstants';
import { getClient } from '../../../services/api/baseApi';
import { parseApiKeys } from '../../../utils/apiUtils';
import { DEFAULT_AUTO_CANVAS_MODEL_ID } from '../../../constants/appConstants';
import { CONNECTION_TEST_MODELS } from '../../../constants/settingsModelOptions';
import { ApiConfigToggle } from './api-config/ApiConfigToggle';
import { ApiKeyInput } from './api-config/ApiKeyInput';
import { ApiProxySettings } from './api-config/ApiProxySettings';
import { ApiConnectionTester } from './api-config/ApiConnectionTester';

interface ApiConfigSectionProps {
  useCustomApiConfig: boolean;
  setUseCustomApiConfig: (value: boolean) => void;
  apiKey: string | null;
  setApiKey: (value: string | null) => void;
  apiProxyUrl: string | null;
  setApiProxyUrl: (value: string | null) => void;
  useApiProxy: boolean;
  setUseApiProxy: (value: boolean) => void;
  liveApiEphemeralTokenEndpoint: string | null;
  setLiveApiEphemeralTokenEndpoint: (value: string | null) => void;
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
  liveApiEphemeralTokenEndpoint,
  setLiveApiEphemeralTokenEndpoint,
  t,
}) => {
  // Test connection state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testModelId, setTestModelId] = useState<string>(DEFAULT_AUTO_CANVAS_MODEL_ID);
  
  // State to manage overflow visibility during transitions
  const [allowOverflow, setAllowOverflow] = useState(useCustomApiConfig);
  const overflowTimerRef = useRef<number | null>(null);

  const iconSize = useResponsiveValue(18, 20);
  const hasEnvKey = !!(import.meta as any).env?.VITE_GEMINI_API_KEY;
  const inputBaseClasses = "w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm custom-scrollbar font-mono";

  useEffect(() => {
    return () => {
      if (overflowTimerRef.current !== null) {
        window.clearTimeout(overflowTimerRef.current);
      }
    };
  }, []);

  const handleUseCustomApiConfigChange = (value: boolean) => {
    if (overflowTimerRef.current !== null) {
      window.clearTimeout(overflowTimerRef.current);
      overflowTimerRef.current = null;
    }

    setUseCustomApiConfig(value);

    if (value) {
      setAllowOverflow(false);
      // Delay allowing overflow until transition matches duration (300ms) to prevent clipping artifacts during expansion
      overflowTimerRef.current = window.setTimeout(() => {
        setAllowOverflow(true);
        overflowTimerRef.current = null;
      }, 300);
      return;
    }

    // Immediately hide overflow when collapsing to ensure clean animation
    setAllowOverflow(false);
  };

  const handleTestConnection = async () => {
      // Pick the key that would be used
      let keyToTest = apiKey;
      
      // If custom config is OFF, or ON but no key provided, we might fall back to env key if available.
      // But for explicit testing, if custom config is ON, we should test what's in the box.
      if (!useCustomApiConfig && hasEnvKey) {
          keyToTest = (import.meta as any).env?.VITE_GEMINI_API_KEY || null;
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
      const keys = parseApiKeys(keyToTest);
      const firstKey = keys[0];
      
      if (!firstKey) {
          setTestStatus('error');
          setTestMessage("Invalid API Key format.");
          return;
      }

      const effectiveUrl = (useCustomApiConfig && useApiProxy && apiProxyUrl) ? apiProxyUrl : null;

      setTestStatus('testing');
      setTestMessage(null);

      try {
          // Use the base API helper to get a client with sanitation logic
          const ai = await getClient(firstKey, effectiveUrl);
          
          const modelIdToUse = testModelId || DEFAULT_AUTO_CANVAS_MODEL_ID;
          
          await ai.models.generateContent({
              model: modelIdToUse,
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

      <div>
        <ApiConfigToggle
            useCustomApiConfig={useCustomApiConfig}
            setUseCustomApiConfig={handleUseCustomApiConfigChange}
            hasEnvKey={hasEnvKey}
            t={t}
        />

        {/* Content - collapsible area */}
        <div className={`transition-all duration-300 ease-in-out ${useCustomApiConfig ? 'opacity-100 max-h-[800px] pt-4' : 'opacity-50 max-h-0'} ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="space-y-5">
                <ApiKeyInput 
                    apiKey={apiKey} 
                    setApiKey={(val) => { setApiKey(val); setTestStatus('idle'); }} 
                    t={t} 
                />

                <ApiProxySettings 
                    useApiProxy={useApiProxy}
                    setUseApiProxy={(val) => { setUseApiProxy(val); setTestStatus('idle'); }}
                    apiProxyUrl={apiProxyUrl}
                    setApiProxyUrl={(val) => { setApiProxyUrl(val); setTestStatus('idle'); }}
                    t={t}
                />

                <div className="space-y-2 pt-2">
                    <label htmlFor="live-token-endpoint-input" className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
                        {t('settingsLiveTokenEndpoint')}
                    </label>
                    <p className="text-xs leading-relaxed text-[var(--theme-text-tertiary)]">
                        {t('settingsLiveTokenEndpointHelp')}
                    </p>
                    <input
                        id="live-token-endpoint-input"
                        type="text"
                        value={liveApiEphemeralTokenEndpoint || ''}
                        onChange={(e) => {
                            const value = e.target.value.trim();
                            setLiveApiEphemeralTokenEndpoint(value || null);
                        }}
                        className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS}`}
                        placeholder={t('settingsLiveTokenEndpointPlaceholder')}
                        aria-label={t('settingsLiveTokenEndpoint')}
                    />
                </div>

                <ApiConnectionTester 
                    onTest={handleTestConnection}
                    testStatus={testStatus}
                    testMessage={testMessage}
                    isTestDisabled={testStatus === 'testing' || (!apiKey && useCustomApiConfig)}
                    availableModels={CONNECTION_TEST_MODELS}
                    testModelId={testModelId}
                    onModelChange={setTestModelId}
                    t={t}
                />
            </div>
        </div>
      </div>
    </div>
  );
};
