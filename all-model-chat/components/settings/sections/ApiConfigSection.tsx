
import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useResponsiveValue } from '../../../hooks/useDevice';
import { getClient } from '../../../services/api/baseApi';
import { parseApiKeys } from '../../../utils/apiUtils';
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
  // Test connection state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testModel, setTestModel] = useState<string>('gemini-2.5-flash');

  const iconSize = useResponsiveValue(18, 20);
  const hasEnvKey = !!process.env.API_KEY;

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
          
          // Using selected model for test
          await ai.models.generateContent({
              model: testModel,
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
        <ApiConfigToggle
            useCustomApiConfig={useCustomApiConfig}
            setUseCustomApiConfig={setUseCustomApiConfig}
            hasEnvKey={hasEnvKey}
            t={t}
        />

        {/* Content */}
        <div className={`transition-all duration-300 ease-in-out ${useCustomApiConfig ? 'opacity-100 max-h-[600px] pt-4' : 'opacity-50 max-h-0 overflow-hidden'}`}>
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
                    t={t}
                    testModel={testModel}
                    onTestModelChange={setTestModel}
                />
            </div>
        </div>
      </div>
    </div>
  );
};
