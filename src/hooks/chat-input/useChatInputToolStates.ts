import { useCallback, useMemo } from 'react';
import type { ChatSettings } from '@/types';
import type { ChatToolSettingKey, ChatToolToggleStates, ToggleableChatToolId } from '@/types/chatTools';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { isOpenAICompatibleApiActive } from '@/utils/openaiCompatibleMode';

interface UseChatInputToolStatesParams {
  currentChatSettings: ChatSettings;
  isLoading: boolean;
  onStopGenerating: () => void;
}

const TOOL_SETTING_KEYS: Record<ToggleableChatToolId, ChatToolSettingKey> = {
  deepSearch: 'isDeepSearchEnabled',
  googleSearch: 'isGoogleSearchEnabled',
  codeExecution: 'isCodeExecutionEnabled',
  localPython: 'isLocalPythonEnabled',
  urlContext: 'isUrlContextEnabled',
};

const getNextSettingsForToolToggle = (settings: ChatSettings, toolId: ToggleableChatToolId): ChatSettings => {
  if (toolId === 'codeExecution') {
    return {
      ...settings,
      isCodeExecutionEnabled: !settings.isCodeExecutionEnabled,
      isLocalPythonEnabled: !settings.isCodeExecutionEnabled ? false : settings.isLocalPythonEnabled,
    };
  }

  if (toolId === 'localPython') {
    return {
      ...settings,
      isLocalPythonEnabled: !settings.isLocalPythonEnabled,
      isCodeExecutionEnabled: !settings.isLocalPythonEnabled ? false : settings.isCodeExecutionEnabled,
    };
  }

  const settingKey = TOOL_SETTING_KEYS[toolId];
  return {
    ...settings,
    [settingKey]: !settings[settingKey],
  };
};

export const useChatInputToolStates = ({
  currentChatSettings,
  isLoading,
  onStopGenerating,
}: UseChatInputToolStatesParams): ChatToolToggleStates => {
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const setCurrentChatSettings = useChatStore((state) => state.setCurrentChatSettings);
  const isOpenAICompatibleMode = useSettingsStore((state) => isOpenAICompatibleApiActive(state.appSettings));

  const createToggle = useCallback(
    (toolId: ToggleableChatToolId) => () => {
      if (!activeSessionId) return;
      if (isLoading) onStopGenerating();

      setCurrentChatSettings((previousSettings) => getNextSettingsForToolToggle(previousSettings, toolId));
    },
    [activeSessionId, isLoading, onStopGenerating, setCurrentChatSettings],
  );

  return useMemo(
    () => ({
      deepSearch: {
        isEnabled: !isOpenAICompatibleMode && !!currentChatSettings.isDeepSearchEnabled,
        onToggle: createToggle('deepSearch'),
      },
      googleSearch: {
        isEnabled: !isOpenAICompatibleMode && !!currentChatSettings.isGoogleSearchEnabled,
        onToggle: createToggle('googleSearch'),
      },
      codeExecution: {
        isEnabled: !isOpenAICompatibleMode && !!currentChatSettings.isCodeExecutionEnabled,
        onToggle: createToggle('codeExecution'),
      },
      localPython: {
        isEnabled: !isOpenAICompatibleMode && !!currentChatSettings.isLocalPythonEnabled,
        onToggle: createToggle('localPython'),
      },
      urlContext: {
        isEnabled: !isOpenAICompatibleMode && !!currentChatSettings.isUrlContextEnabled,
        onToggle: createToggle('urlContext'),
      },
    }),
    [createToggle, currentChatSettings, isOpenAICompatibleMode],
  );
};
