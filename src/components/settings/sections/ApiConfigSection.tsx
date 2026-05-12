import React, { useState, useEffect, useRef } from 'react';
import { RadioTower } from 'lucide-react';
import type { AppSettings, ModelOption } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { DEFAULT_LIVE_ARTIFACTS_MODEL_ID, SETTINGS_INPUT_CLASS } from '@/constants/appConstants';
import { CONNECTION_TEST_MODELS } from '@/constants/settingsModelOptions';
import { getClient } from '@/services/api/apiClient';
import { fetchOpenAICompatibleModels, sendOpenAICompatibleMessageNonStream } from '@/services/api/openaiCompatibleApi';
import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from '@/utils/apiProxyUrl';
import { isServerManagedApiEnabledForProxyRequests, parseApiKeys, SERVER_MANAGED_API_KEY } from '@/utils/apiUtils';
import { ApiConfigToggle } from './api-config/ApiConfigToggle';
import { ApiKeyInput } from './api-config/ApiKeyInput';
import { ApiProxySettings } from './api-config/ApiProxySettings';
import { ApiConnectionTester } from './api-config/ApiConnectionTester';
import { OpenAICompatibleModelListEditor } from './api-config/OpenAICompatibleModelListEditor';
import { FileStrategyControl } from './appearance/FileStrategyControl';
import { Toggle } from '@/components/shared/Toggle';
import { isOpenAICompatibleApiActive } from '@/utils/openaiCompatibleMode';

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
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const mergeOpenAICompatibleModels = (currentModels: ModelOption[], fetchedModels: ModelOption[]): ModelOption[] => {
  const seenIds = new Set<string>();
  const mergedModels: ModelOption[] = [];

  const appendModel = (model: ModelOption) => {
    const modelId = model.id.trim();
    if (!modelId || seenIds.has(modelId)) {
      return;
    }

    seenIds.add(modelId);
    mergedModels.push({
      ...model,
      id: modelId,
      name: model.name.trim() || modelId,
    });
  };

  currentModels.forEach(appendModel);
  fetchedModels.forEach(appendModel);

  return mergedModels.map((model, index) => {
    const nextModel = { ...model };
    if (index === 0) {
      nextModel.isPinned = true;
    } else {
      delete nextModel.isPinned;
    }
    return nextModel;
  });
};

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
  settings,
  onUpdate,
}) => {
  const { t } = useI18n();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [modelFetchStatus, setModelFetchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [modelFetchMessage, setModelFetchMessage] = useState<string | null>(null);
  const [testModelId, setTestModelId] = useState<string>(DEFAULT_LIVE_ARTIFACTS_MODEL_ID);
  const [allowOverflow, setAllowOverflow] = useState(useCustomApiConfig);
  const overflowTimerRef = useRef<number | null>(null);
  const viteEnv = (import.meta as ImportMeta & { env?: { VITE_GEMINI_API_KEY?: string; VITE_OPENAI_API_KEY?: string } })
    .env;

  const hasEnvKey = !!viteEnv?.VITE_GEMINI_API_KEY;
  const hasOpenAIEnvKey = !!viteEnv?.VITE_OPENAI_API_KEY;
  const canUseServerManagedTestKey = isServerManagedApiEnabledForProxyRequests({
    serverManagedApi,
    useCustomApiConfig,
    useApiProxy,
    apiProxyUrl,
  });
  const apiMode = settings.apiMode ?? 'gemini-native';
  const isOpenAICompatibleApiEnabled = settings.isOpenAICompatibleApiEnabled === true;
  const isOpenAICompatibleMode = isOpenAICompatibleApiActive(settings);
  const openaiCompatibleApiKey = settings.openaiCompatibleApiKey;

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

  const handleOpenAICompatibleApiEnabledChange = (enabled: boolean) => {
    onUpdate('isOpenAICompatibleApiEnabled', enabled);
    onUpdate('apiMode', enabled ? 'openai-compatible' : 'gemini-native');
    setTestStatus('idle');
    setTestMessage(null);
    setModelFetchStatus('idle');
    setModelFetchMessage(null);
  };

  const resetOpenAICompatibleModelFetch = () => {
    setModelFetchStatus('idle');
    setModelFetchMessage(null);
  };

  const resolveOpenAICompatibleKey = (): string | null =>
    openaiCompatibleApiKey || viteEnv?.VITE_OPENAI_API_KEY || null;

  const handleFetchOpenAICompatibleModels = async () => {
    const keyToFetch = resolveOpenAICompatibleKey();

    if (!keyToFetch) {
      setModelFetchStatus('error');
      setModelFetchMessage(t('apiConfig_noKeyAvailable'));
      return;
    }

    const keys = parseApiKeys(keyToFetch);
    const firstKey = keys[0];

    if (!firstKey) {
      setModelFetchStatus('error');
      setModelFetchMessage(t('apiConfig_invalidKeyFormat'));
      return;
    }

    setModelFetchStatus('loading');
    setModelFetchMessage(null);

    try {
      const fetchedModels = await fetchOpenAICompatibleModels(
        firstKey,
        settings.openaiCompatibleBaseUrl,
        new AbortController().signal,
      );

      if (fetchedModels.length === 0) {
        setModelFetchStatus('error');
        setModelFetchMessage(t('settingsOpenAICompatibleModelFetchEmpty'));
        return;
      }

      const mergedModels = mergeOpenAICompatibleModels(settings.openaiCompatibleModels ?? [], fetchedModels);
      onUpdate('openaiCompatibleModels', mergedModels);

      if (!mergedModels.some((model) => model.id === settings.openaiCompatibleModelId)) {
        onUpdate('openaiCompatibleModelId', mergedModels[0].id);
      }

      setModelFetchStatus('success');
      setModelFetchMessage(
        t('settingsOpenAICompatibleModelFetchSuccess').replace('{count}', String(fetchedModels.length)),
      );
      setTestStatus('idle');
      setTestMessage(null);
    } catch (error) {
      setModelFetchStatus('error');
      setModelFetchMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleTestConnection = async () => {
    const resolveKeyToTest = (): string | null => {
      if (isOpenAICompatibleMode) {
        return resolveOpenAICompatibleKey();
      }
      if (apiKey) return apiKey;
      if (!useCustomApiConfig && hasEnvKey) {
        return viteEnv?.VITE_GEMINI_API_KEY || null;
      }
      if (canUseServerManagedTestKey) return SERVER_MANAGED_API_KEY;
      return null;
    };

    const keyToTest = resolveKeyToTest();

    if (!isOpenAICompatibleMode && !keyToTest && useCustomApiConfig && !canUseServerManagedTestKey) {
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
      const modelIdToUse = isOpenAICompatibleMode
        ? settings.openaiCompatibleModelId
        : testModelId || DEFAULT_LIVE_ARTIFACTS_MODEL_ID;

      if (isOpenAICompatibleMode) {
        let compatibleError: Error | null = null;
        await sendOpenAICompatibleMessageNonStream(
          firstKey,
          modelIdToUse,
          [],
          [{ text: 'Hello' }],
          {
            baseUrl: settings.openaiCompatibleBaseUrl,
            temperature: 0,
          },
          new AbortController().signal,
          (error) => {
            compatibleError = error;
          },
          () => undefined,
        );

        if (compatibleError) {
          throw compatibleError;
        }
      } else {
        const ai = await getClient(firstKey, effectiveUrl);

        await ai.models.generateContent({
          model: modelIdToUse,
          contents: 'Hello',
        });
      }

      setTestStatus('success');
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const modeButtonClass = (isActive: boolean) =>
    `relative flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-secondary)] ${
      isActive
        ? 'bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
        : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)]/60 hover:text-[var(--theme-text-primary)]'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <div className="space-y-3 pb-4">
          <div
            className="flex items-center justify-between py-3 cursor-pointer group select-none relative z-10"
            onClick={() => handleOpenAICompatibleApiEnabledChange(!isOpenAICompatibleApiEnabled)}
          >
            <div className="flex flex-col flex-grow pr-4">
              <span className="text-sm font-medium text-[var(--theme-text-primary)] group-hover:text-[var(--theme-text-link)] transition-colors">
                {t('settingsOpenAICompatibleToggleLabel')}
              </span>
              <span className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
                {t('settingsOpenAICompatibleToggleHelp')}
              </span>
            </div>
            <div onClick={(event) => event.stopPropagation()}>
              <Toggle
                id="openai-compatible-api-enabled-toggle"
                checked={isOpenAICompatibleApiEnabled}
                onChange={handleOpenAICompatibleApiEnabledChange}
                ariaLabel={t('settingsOpenAICompatibleToggleLabel')}
              />
            </div>
          </div>
          {isOpenAICompatibleApiEnabled && (
            <div
              role="group"
              aria-label={t('settingsApiModeLabel')}
              className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)]/35 p-1 shadow-sm"
            >
              <button
                type="button"
                className={modeButtonClass(apiMode === 'gemini-native')}
                aria-pressed={apiMode === 'gemini-native'}
                onClick={() => onUpdate('apiMode', 'gemini-native')}
              >
                {t('settingsApiModeGeminiNative')}
              </button>
              <button
                type="button"
                className={modeButtonClass(isOpenAICompatibleMode)}
                aria-pressed={isOpenAICompatibleMode}
                onClick={() => onUpdate('apiMode', 'openai-compatible')}
              >
                {t('settingsApiModeOpenAICompatible')}
              </button>
            </div>
          )}
          {isOpenAICompatibleMode && (
            <div className="space-y-4">
              <ApiKeyInput
                apiKey={openaiCompatibleApiKey}
                setApiKey={(val) => {
                  onUpdate('openaiCompatibleApiKey', val);
                  setTestStatus('idle');
                  resetOpenAICompatibleModelFetch();
                }}
                label={t('settingsOpenAICompatibleApiKey')}
                placeholder={t('apiConfig_openai_key_placeholder')}
                helpText={t('settingsOpenAICompatibleApiKeyHelp')}
              />
              <OpenAICompatibleModelListEditor
                models={settings.openaiCompatibleModels ?? []}
                selectedModelId={settings.openaiCompatibleModelId}
                onModelsChange={(models) => {
                  onUpdate('openaiCompatibleModels', models);
                  setTestStatus('idle');
                  resetOpenAICompatibleModelFetch();
                }}
                onSelectedModelChange={(modelId) => {
                  onUpdate('openaiCompatibleModelId', modelId);
                  setTestStatus('idle');
                  resetOpenAICompatibleModelFetch();
                }}
                onFetchModels={handleFetchOpenAICompatibleModels}
                isFetchingModels={modelFetchStatus === 'loading'}
                isFetchModelsDisabled={modelFetchStatus === 'loading' || (!openaiCompatibleApiKey && !hasOpenAIEnvKey)}
                fetchModelsStatus={modelFetchStatus === 'loading' ? 'idle' : modelFetchStatus}
                fetchModelsMessage={modelFetchMessage}
              />
              <div className="space-y-2">
                <label
                  htmlFor="openai-compatible-base-url-input"
                  className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]"
                >
                  {t('settingsOpenAICompatibleBaseUrl')}
                </label>
                <input
                  id="openai-compatible-base-url-input"
                  type="text"
                  value={settings.openaiCompatibleBaseUrl || ''}
                  onChange={(event) => {
                    onUpdate('openaiCompatibleBaseUrl', event.target.value);
                    resetOpenAICompatibleModelFetch();
                  }}
                  className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm custom-scrollbar font-mono ${SETTINGS_INPUT_CLASS}`}
                  placeholder={DEFAULT_OPENAI_COMPATIBLE_BASE_URL}
                  aria-label={t('settingsOpenAICompatibleBaseUrl')}
                />
                <p className="text-xs leading-relaxed text-[var(--theme-text-tertiary)]">
                  {t('settingsOpenAICompatibleHelp')}
                </p>
              </div>
              <ApiConnectionTester
                onTest={handleTestConnection}
                testStatus={testStatus}
                testMessage={testMessage}
                isTestDisabled={testStatus === 'testing' || (!openaiCompatibleApiKey && !hasOpenAIEnvKey)}
              />
            </div>
          )}
        </div>

        {!isOpenAICompatibleMode && (
          <>
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
                        <p className="text-sm font-medium text-[var(--theme-text-primary)]">
                          {t('settingsLiveAutomaticTitle')}
                        </p>
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
          </>
        )}
      </div>

      {!isOpenAICompatibleMode && <FileStrategyControl settings={settings} onUpdate={onUpdate} />}
    </div>
  );
};
