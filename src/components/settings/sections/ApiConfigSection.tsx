import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, KeyRound, RadioTower } from 'lucide-react';
import type { ModelOption } from '../../../types';
import { useI18n } from '../../../contexts/I18nContext';
import { useResponsiveValue } from '../../../hooks/useDevice';
import { DEFAULT_AUTO_CANVAS_MODEL_ID, SETTINGS_INPUT_CLASS } from '../../../constants/appConstants';
import { CONNECTION_TEST_MODELS } from '../../../constants/settingsModelOptions';
import { getClient } from '../../../services/api/apiClient';
import {
  isServerManagedApiEnabledForProxyRequests,
  parseApiKeys,
  SERVER_MANAGED_API_KEY,
} from '../../../utils/apiUtils';
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
  serverManagedApi: boolean;
  availableModels?: ModelOption[];
  liveApiEphemeralTokenEndpoint: string | null;
  setLiveApiEphemeralTokenEndpoint: (value: string | null) => void;
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
  serverManagedApi,
  liveApiEphemeralTokenEndpoint,
  setLiveApiEphemeralTokenEndpoint,
}) => {
  const { t } = useI18n();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testModelId, setTestModelId] = useState<string>(DEFAULT_AUTO_CANVAS_MODEL_ID);
  const [allowOverflow, setAllowOverflow] = useState(useCustomApiConfig);
  const [showAdvancedLiveSettings, setShowAdvancedLiveSettings] = useState(false);
  const overflowTimerRef = useRef<number | null>(null);
  const viteEnv = (import.meta as ImportMeta & { env?: { VITE_GEMINI_API_KEY?: string } }).env;

  const iconSize = useResponsiveValue(18, 20);
  const hasEnvKey = !!viteEnv?.VITE_GEMINI_API_KEY;
  const inputBaseClasses =
    'w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm custom-scrollbar font-mono';
  const canUseServerManagedTestKey = isServerManagedApiEnabledForProxyRequests({
    serverManagedApi,
    useCustomApiConfig,
    useApiProxy,
    apiProxyUrl,
  });

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
      overflowTimerRef.current = window.setTimeout(() => {
        setAllowOverflow(true);
        overflowTimerRef.current = null;
      }, 300);
      return;
    }

    setAllowOverflow(false);
  };

  const handleTestConnection = async () => {
    const resolveKeyToTest = (): string | null => {
      if (apiKey) return apiKey;
      if (!useCustomApiConfig && hasEnvKey) {
        return viteEnv?.VITE_GEMINI_API_KEY || null;
      }
      if (canUseServerManagedTestKey) return SERVER_MANAGED_API_KEY;
      return null;
    };

    const keyToTest = resolveKeyToTest();

    if (!keyToTest && useCustomApiConfig && !canUseServerManagedTestKey) {
      setTestStatus('error');
      setTestMessage(t('apiConfig_noKeyProvided'));
      return;
    }

    if (!keyToTest) {
      setTestStatus('error');
      setTestMessage(t('apiConfig_noKeyAvailable'));
      return;
    }

    const keys = parseApiKeys(keyToTest);
    const firstKey = keys[0];

    if (!firstKey) {
      setTestStatus('error');
      setTestMessage(t('apiConfig_invalidKeyFormat'));
      return;
    }

    const effectiveUrl = useCustomApiConfig && useApiProxy && apiProxyUrl ? apiProxyUrl : null;

    setTestStatus('testing');
    setTestMessage(null);

    try {
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
        />

        <div
          className={`transition-all duration-300 ease-in-out ${useCustomApiConfig ? 'opacity-100 max-h-[1000px] pt-4' : 'opacity-50 max-h-0'} ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'}`}
        >
          <div className="space-y-5">
            <ApiKeyInput
              apiKey={apiKey}
              setApiKey={(val) => {
                setApiKey(val);
                setTestStatus('idle');
              }}
            />

            <ApiProxySettings
              useApiProxy={useApiProxy}
              setUseApiProxy={(val) => {
                setUseApiProxy(val);
                setTestStatus('idle');
              }}
              apiProxyUrl={apiProxyUrl}
              setApiProxyUrl={(val) => {
                setApiProxyUrl(val);
                setTestStatus('idle');
              }}
            />

            <div className="space-y-3 pt-2">
              <div className="rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)]/20 p-3">
                <div className="flex items-start gap-3">
                  <RadioTower
                    size={16}
                    className="mt-0.5 flex-shrink-0 text-[var(--theme-text-link)]"
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium text-[var(--theme-text-primary)]">
                        {t('settingsLiveAutomaticTitle')}
                      </p>
                      <code className="rounded bg-[var(--theme-bg-secondary)] px-1.5 py-0.5 text-[11px] text-[var(--theme-text-secondary)]">
                        {liveApiEphemeralTokenEndpoint || '/api/live-token'}
                      </code>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--theme-text-tertiary)]">
                      {t('settingsLiveAutomaticHelp')}
                    </p>
                    {useApiProxy && (
                      <p className="text-xs leading-relaxed text-[var(--theme-text-tertiary)]">
                        {t('settingsLiveProxyCompatibilityHelp')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedLiveSettings((value) => !value)}
                className="flex w-full items-center justify-between rounded-lg border border-transparent px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] transition-colors hover:border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)]/40 hover:text-[var(--theme-text-primary)]"
                aria-expanded={showAdvancedLiveSettings}
                aria-controls="advanced-live-settings"
              >
                <span>{t('settingsLiveAdvancedToggle')}</span>
                {showAdvancedLiveSettings ? (
                  <ChevronDown size={14} strokeWidth={1.5} />
                ) : (
                  <ChevronRight size={14} strokeWidth={1.5} />
                )}
              </button>

              {showAdvancedLiveSettings && (
                <div id="advanced-live-settings" className="space-y-2">
                  <label
                    htmlFor="live-token-endpoint-input"
                    className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]"
                  >
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
              )}
            </div>

            <ApiConnectionTester
              onTest={handleTestConnection}
              testStatus={testStatus}
              testMessage={testMessage}
              isTestDisabled={
                testStatus === 'testing' || (!apiKey && useCustomApiConfig && !canUseServerManagedTestKey)
              }
              availableModels={CONNECTION_TEST_MODELS}
              testModelId={testModelId}
              onModelChange={setTestModelId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
