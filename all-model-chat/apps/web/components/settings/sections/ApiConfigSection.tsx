
import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';
import { useResponsiveValue } from '../../../hooks/useDevice';
import { getClient } from '../../../services/api/baseApi';
import { parseApiKeys } from '../../../utils/apiUtils';
import { resolveBffEndpoint } from '../../../services/api/bffApi';
import { ApiConfigToggle } from './api-config/ApiConfigToggle';
import { ApiKeyInput } from './api-config/ApiKeyInput';
import { ApiProxySettings } from './api-config/ApiProxySettings';
import { ApiConnectionTester } from './api-config/ApiConnectionTester';
import { ModelOption } from '../../../types';

interface ApiConfigSectionProps {
  useCustomApiConfig: boolean;
  setUseCustomApiConfig: (value: boolean) => void;
  apiKey: string | null;
  setApiKey: (value: string | null) => void;
  apiProxyUrl: string | null;
  setApiProxyUrl: (value: string | null) => void;
  useApiProxy: boolean;
  setUseApiProxy: (value: boolean) => void;
  availableModels: ModelOption[];
  t: (key: string) => string;
}

const CONNECTION_TEST_MODELS: ModelOption[] = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
  { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27b IT' },
];

export const ApiConfigSection: React.FC<ApiConfigSectionProps> = ({
  useCustomApiConfig,
  setUseCustomApiConfig,
  apiKey,
  setApiKey,
  apiProxyUrl,
  setApiProxyUrl,
  useApiProxy,
  setUseApiProxy,
  availableModels,
  t,
}) => {
  // Test connection state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testModelId, setTestModelId] = useState<string>('gemini-3-flash-preview');

  // State to manage overflow visibility during transitions
  const [allowOverflow, setAllowOverflow] = useState(useCustomApiConfig);

  const iconSize = useResponsiveValue(18, 20);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (useCustomApiConfig) {
      // Delay allowing overflow until transition matches duration (300ms) to prevent clipping artifacts during expansion
      timer = setTimeout(() => setAllowOverflow(true), 300);
    } else {
      // Immediately hide overflow when collapsing to ensure clean animation
      setAllowOverflow(false);
    }
    return () => clearTimeout(timer);
  }, [useCustomApiConfig]);

  const handleTestConnection = async () => {
    if (!useCustomApiConfig) {
      setTestStatus('testing');
      setTestMessage(null);
      try {
        const healthResponse = await fetch(resolveBffEndpoint('/health'), {
          method: 'GET',
        });
        if (!healthResponse.ok) {
          throw new Error(`BFF health check failed with status ${healthResponse.status}.`);
        }

        const payload = (await healthResponse.json()) as {
          provider?: { configuredKeyCount?: number };
        };
        const configuredKeyCount = Number(payload?.provider?.configuredKeyCount || 0);
        if (configuredKeyCount <= 0) {
          throw new Error('Backend API key is not configured.');
        }

        setTestStatus('success');
      } catch (error) {
        setTestStatus('error');
        setTestMessage(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    const keyToTest = apiKey;
    if (!keyToTest) {
      setTestStatus('error');
      setTestMessage("No API Key provided to test.");
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
      const ai = getClient(firstKey, effectiveUrl);

      const modelIdToUse = testModelId || 'gemini-3-flash-preview';

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
          setUseCustomApiConfig={setUseCustomApiConfig}
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
