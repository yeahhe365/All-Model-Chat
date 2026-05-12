import { logService } from '@/services/logService';
import { useState, useEffect, useCallback, useRef } from 'react';
import { type UploadedFile, type AppSettings } from '@/types';
import { buildContentParts } from '@/utils/chat/builder';
import { generateUniqueId } from '@/utils/chat/ids';
import { createManagedObjectUrl } from '@/services/objectUrlManager';
import { cleanupFilePreviewUrl, cleanupFilePreviewUrls } from '@/utils/fileHelpers';
import { countTokensApi } from '@/services/api/generation/tokenApi';
import {
  appendFunctionDeclarationsToTools,
  buildGenerationConfig,
  toCountTokensConfig,
} from '@/services/api/generationConfig';
import { createLocalPythonToolDeclaration } from '@/features/local-python/clientFunctionTool';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  getApiKeyErrorTranslationKey,
  getGeminiKeyForRequest,
  isServerManagedApiEnabledForProxyRequests,
  parseApiKeys,
  SERVER_MANAGED_API_KEY,
} from '@/utils/apiUtils';
import { useI18n } from '@/contexts/I18nContext';

interface UseTokenCountLogicProps {
  isOpen: boolean;
  initialText: string;
  initialFiles: UploadedFile[];
  appSettings: AppSettings;
  currentModelId: string;
}

const mergeTokenCountAppSettings = (modalAppSettings: AppSettings, latestStoredSettings: AppSettings): AppSettings => ({
  ...latestStoredSettings,
  ...modalAppSettings,
  useCustomApiConfig: modalAppSettings.useCustomApiConfig ?? latestStoredSettings.useCustomApiConfig,
  serverManagedApi: modalAppSettings.serverManagedApi ?? latestStoredSettings.serverManagedApi,
  apiKey: modalAppSettings.apiKey ?? latestStoredSettings.apiKey,
  apiProxyUrl: modalAppSettings.apiProxyUrl ?? latestStoredSettings.apiProxyUrl,
  useApiProxy: modalAppSettings.useApiProxy ?? latestStoredSettings.useApiProxy,
});

const resolveTokenCountRequestKey = (
  effectiveAppSettings: AppSettings,
  modelId: string,
): { key: string } | { error: string } => {
  const parsedKeys = parseApiKeys(effectiveAppSettings.apiKey);

  if (effectiveAppSettings.useCustomApiConfig && parsedKeys.length > 0) {
    return { key: parsedKeys[0] };
  }

  if (isServerManagedApiEnabledForProxyRequests(effectiveAppSettings)) {
    return { key: SERVER_MANAGED_API_KEY };
  }

  const tempSettings = { ...effectiveAppSettings, modelId };
  const keyResult = getGeminiKeyForRequest(effectiveAppSettings, tempSettings, { skipIncrement: true });

  if ('error' in keyResult) {
    return { error: keyResult.error };
  }

  return { key: keyResult.key };
};

export const useTokenCountLogic = ({
  isOpen,
  initialText,
  initialFiles,
  appSettings,
  currentModelId,
}: UseTokenCountLogicProps) => {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedModelId, setSelectedModelId] = useState(currentModelId);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestStoredSettings = useSettingsStore((state) => state.appSettings);

  const performCalculation = useCallback(
    async (txt: string, fls: UploadedFile[], modelId: string) => {
      if (!txt.trim() && fls.length === 0) return;

      setIsLoading(true);
      setError(null);
      setTokenCount(null);

      const effectiveAppSettings = mergeTokenCountAppSettings(appSettings, latestStoredSettings);
      const keyResult = resolveTokenCountRequestKey(effectiveAppSettings, modelId);

      if ('error' in keyResult) {
        const translationKey = getApiKeyErrorTranslationKey(keyResult.error);
        setError(translationKey ? t(translationKey) : keyResult.error);
        setIsLoading(false);
        return;
      }

      try {
        const preferCodeExecutionFileInputs =
          !!effectiveAppSettings.isCodeExecutionEnabled && !effectiveAppSettings.isLocalPythonEnabled;
        const { contentParts } = await buildContentParts(
          txt,
          fls,
          modelId,
          effectiveAppSettings.mediaResolution,
          preferCodeExecutionFileInputs,
        );

        if (contentParts.length === 0) {
          setTokenCount(0);
          return;
        }

        const generationConfig = await buildGenerationConfig({
          settings: effectiveAppSettings,
          modelId,
          isLocalPythonEnabled: false,
        });

        const requestConfig = effectiveAppSettings.isLocalPythonEnabled
          ? appendFunctionDeclarationsToTools(modelId, generationConfig, [createLocalPythonToolDeclaration()])
          : generationConfig;

        const count = await countTokensApi(keyResult.key, modelId, contentParts, toCountTokensConfig(requestConfig));
        setTokenCount(count);
      } catch (err) {
        logService.error('Token calculation failed', err);
        const message = err instanceof Error ? err.message : String(err);
        setError(t('token_count_error_with_message').replace('{message}', message));
      } finally {
        setIsLoading(false);
      }
    },
    [appSettings, latestStoredSettings, t],
  );

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      const shallowFiles = [...initialFiles];
      setFiles(shallowFiles);
      setSelectedModelId(currentModelId);
      setTokenCount(null);
      setError(null);

      if (initialText.trim() || shallowFiles.length > 0) {
        performCalculation(initialText, shallowFiles, currentModelId);
      }
    }
  }, [isOpen, initialText, initialFiles, currentModelId, performCalculation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        id: generateUniqueId(),
        name: file.name,
        type: file.type,
        size: file.size,
        rawFile: file,
        dataUrl: createManagedObjectUrl(file),
        uploadState: 'active' as const,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
      setTokenCount(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const removedFile = prev.find((file) => file.id === id);
      cleanupFilePreviewUrl(removedFile);
      return prev.filter((f) => f.id !== id);
    });
    setTokenCount(null);
  };

  const clearAll = () => {
    setText('');
    setFiles((prev) => {
      cleanupFilePreviewUrls(prev);
      return [];
    });
    setTokenCount(null);
  };

  const handleCalculateClick = () => {
    performCalculation(text, files, selectedModelId);
  };

  const handleModelSelect = (id: string) => {
    setSelectedModelId(id);
    setTokenCount(null);
  };

  return {
    text,
    setText,
    files,
    selectedModelId,
    tokenCount,
    isLoading,
    error,
    fileInputRef,
    handleFileChange,
    removeFile,
    clearAll,
    handleCalculateClick,
    handleModelSelect,
    setTokenCount,
  };
};
