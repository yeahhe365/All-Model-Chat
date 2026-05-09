import { useCallback, useEffect, useState } from 'react';

import {
  isBboxSystemInstruction,
  isLiveArtifactsSystemInstruction,
  isHdGuideSystemInstruction,
  loadBboxSystemPrompt,
  loadLiveArtifactsSystemPrompt,
  loadHdGuideSystemPrompt,
} from '../../constants/promptHelpers';
import { CHAT_INPUT_TEXTAREA_SELECTOR, DEFAULT_SYSTEM_INSTRUCTION } from '../../constants/appConstants';
import type { AppSettings, ChatSettings, InputCommand, SavedChatSession } from '../../types';

interface PendingLiveArtifactsPromptActivation {
  systemInstruction: string;
  targetSessionId: string | null;
}

interface LiveArtifactsPromptOverrideState {
  active: boolean;
  targetSessionId: string | null;
}

interface UseAppPromptModesOptions {
  language?: 'en' | 'zh';
  appSettings: {
    isAutoSendOnSuggestionClick?: boolean;
    systemInstruction?: string | null;
  };
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  activeChat: SavedChatSession | undefined;
  activeSessionId: string | null;
  currentChatSettings: ChatSettings;
  setCurrentChatSettings: (updater: (prev: ChatSettings) => ChatSettings) => void;
  handleSendMessage: (args: { text: string }) => void;
  setCommandedInput: (command: InputCommand) => void;
}

export const focusChatInput = (delayMs = 50) => {
  setTimeout(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const textarea = document.querySelector(CHAT_INPUT_TEXTAREA_SELECTOR) as HTMLTextAreaElement | null;
    textarea?.focus();
  }, delayMs);
};

export const useAppPromptModes = ({
  language = 'zh',
  appSettings,
  setAppSettings,
  activeChat,
  activeSessionId,
  currentChatSettings,
  setCurrentChatSettings,
  handleSendMessage,
  setCommandedInput,
}: UseAppPromptModesOptions) => {
  const [pendingLiveArtifactsPromptActivation, setPendingLiveArtifactsPromptActivation] =
    useState<PendingLiveArtifactsPromptActivation | null>(null);
  const [liveArtifactsPromptBusySessionId, setLiveArtifactsPromptBusySessionId] = useState<string | null>(null);
  const [liveArtifactsPromptOverrideState, setLiveArtifactsPromptOverrideState] = useState<LiveArtifactsPromptOverrideState | null>(null);

  const currentLiveArtifactsPromptTargetSessionId = activeSessionId ?? null;
  const liveArtifactsPromptOverrideActive =
    liveArtifactsPromptOverrideState?.targetSessionId === currentLiveArtifactsPromptTargetSessionId
      ? liveArtifactsPromptOverrideState.active
      : null;
  const liveArtifactsPromptBusy = liveArtifactsPromptBusySessionId === currentLiveArtifactsPromptTargetSessionId;
  const persistedLiveArtifactsPromptActive =
    isLiveArtifactsSystemInstruction(currentChatSettings.systemInstruction) ||
    isLiveArtifactsSystemInstruction(appSettings.systemInstruction);

  const isLiveArtifactsPromptActive = liveArtifactsPromptOverrideActive ?? persistedLiveArtifactsPromptActive;

  useEffect(() => {
    if (!pendingLiveArtifactsPromptActivation) {
      return;
    }

    const pendingActivation = pendingLiveArtifactsPromptActivation;
    const targetMatches =
      pendingActivation.targetSessionId === null || pendingActivation.targetSessionId === activeSessionId;

    if (!targetMatches) {
      return;
    }

    if (activeChat && isLiveArtifactsSystemInstruction(activeChat.settings.systemInstruction)) {
      queueMicrotask(() => {
        setPendingLiveArtifactsPromptActivation((current) => (current === pendingActivation ? null : current));
      });
      return;
    }

    if (!activeSessionId || !activeChat) {
      return;
    }

    setCurrentChatSettings((prev) =>
      isLiveArtifactsSystemInstruction(prev.systemInstruction)
        ? prev
        : {
            ...prev,
            systemInstruction: pendingActivation.systemInstruction,
          },
    );

    queueMicrotask(() => {
      setPendingLiveArtifactsPromptActivation((current) => (current === pendingActivation ? null : current));
    });
  }, [activeChat, activeSessionId, pendingLiveArtifactsPromptActivation, setCurrentChatSettings]);

  useEffect(() => {
    if (
      !liveArtifactsPromptOverrideState ||
      liveArtifactsPromptOverrideState.targetSessionId !== currentLiveArtifactsPromptTargetSessionId
    ) {
      return;
    }

    const actualActive =
      isLiveArtifactsSystemInstruction(currentChatSettings.systemInstruction) ||
      isLiveArtifactsSystemInstruction(appSettings.systemInstruction);
    if (actualActive === liveArtifactsPromptOverrideState.active) {
      queueMicrotask(() => {
        setLiveArtifactsPromptOverrideState((current) =>
          current &&
          current.targetSessionId === liveArtifactsPromptOverrideState.targetSessionId &&
          current.active === liveArtifactsPromptOverrideState.active
            ? null
            : current,
        );
        setLiveArtifactsPromptBusySessionId((current) =>
          current === liveArtifactsPromptOverrideState.targetSessionId ? null : current,
        );
      });
    }
  }, [
    appSettings.systemInstruction,
    liveArtifactsPromptOverrideState,
    currentLiveArtifactsPromptTargetSessionId,
    currentChatSettings.systemInstruction,
  ]);

  const activateLiveArtifactsPrompt = useCallback(
    async (targetSessionId: string | null) => {
      const newSystemInstruction = await loadLiveArtifactsSystemPrompt(language);

      setPendingLiveArtifactsPromptActivation({
        systemInstruction: newSystemInstruction,
        targetSessionId,
      });
      setAppSettings((prev) => ({ ...prev, systemInstruction: newSystemInstruction }));

      return newSystemInstruction;
    },
    [language, setAppSettings],
  );

  const handleLoadLiveArtifactsPromptAndSave = useCallback(async () => {
    const targetSessionId = activeSessionId ?? null;

    if (liveArtifactsPromptBusy) {
      return;
    }

    const isCurrentlyLiveArtifactsPrompt = liveArtifactsPromptOverrideActive ?? persistedLiveArtifactsPromptActive;

    setLiveArtifactsPromptBusySessionId(targetSessionId);
    setLiveArtifactsPromptOverrideState({
      active: !isCurrentlyLiveArtifactsPrompt,
      targetSessionId,
    });

    try {
      if (isCurrentlyLiveArtifactsPrompt) {
        setPendingLiveArtifactsPromptActivation(null);
        setAppSettings((prev) => ({ ...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION }));
        if (activeSessionId) {
          setCurrentChatSettings((prev) => ({
            ...prev,
            systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
          }));
        }
      } else {
        await activateLiveArtifactsPrompt(targetSessionId);
      }
    } catch (error) {
      setLiveArtifactsPromptOverrideState((current) =>
        current?.targetSessionId === targetSessionId ? { active: isCurrentlyLiveArtifactsPrompt, targetSessionId } : current,
      );
      setLiveArtifactsPromptBusySessionId((current) => (current === targetSessionId ? null : current));
      throw error;
    }

    focusChatInput();
  }, [
    activateLiveArtifactsPrompt,
    activeSessionId,
    liveArtifactsPromptBusy,
    liveArtifactsPromptOverrideActive,
    persistedLiveArtifactsPromptActive,
    setAppSettings,
    setCurrentChatSettings,
  ]);

  const handleToggleBBoxMode = useCallback(async () => {
    const isCurrentlyBBox = isBboxSystemInstruction(currentChatSettings.systemInstruction);

    if (isCurrentlyBBox) {
      setAppSettings((prev) => ({
        ...prev,
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        isCodeExecutionEnabled: false,
      }));
      if (activeSessionId) {
        setCurrentChatSettings((prev) => ({
          ...prev,
          systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
          isCodeExecutionEnabled: false,
        }));
      }
      return;
    }

    const bboxPrompt = await loadBboxSystemPrompt();
    setAppSettings((prev) => ({
      ...prev,
      systemInstruction: bboxPrompt,
      isCodeExecutionEnabled: true,
    }));
    if (activeSessionId) {
      setCurrentChatSettings((prev) => ({
        ...prev,
        systemInstruction: bboxPrompt,
        isCodeExecutionEnabled: true,
      }));
    }
  }, [activeSessionId, currentChatSettings.systemInstruction, setAppSettings, setCurrentChatSettings]);

  const handleToggleGuideMode = useCallback(async () => {
    const isCurrentlyGuide = isHdGuideSystemInstruction(currentChatSettings.systemInstruction);

    if (isCurrentlyGuide) {
      setAppSettings((prev) => ({
        ...prev,
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        isCodeExecutionEnabled: false,
      }));
      if (activeSessionId) {
        setCurrentChatSettings((prev) => ({
          ...prev,
          systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
          isCodeExecutionEnabled: false,
        }));
      }
      return;
    }

    const guidePrompt = await loadHdGuideSystemPrompt();
    setAppSettings((prev) => ({
      ...prev,
      systemInstruction: guidePrompt,
      isCodeExecutionEnabled: true,
    }));
    if (activeSessionId) {
      setCurrentChatSettings((prev) => ({
        ...prev,
        systemInstruction: guidePrompt,
        isCodeExecutionEnabled: true,
      }));
    }
  }, [activeSessionId, currentChatSettings.systemInstruction, setAppSettings, setCurrentChatSettings]);

  const handleSuggestionClick = useCallback(
    async (type: 'homepage' | 'organize' | 'follow-up', text: string) => {
      const { isAutoSendOnSuggestionClick } = appSettings;

      if (type === 'organize' && isLiveArtifactsPromptActive) {
        setPendingLiveArtifactsPromptActivation(null);
        setLiveArtifactsPromptOverrideState({
          active: false,
          targetSessionId: currentLiveArtifactsPromptTargetSessionId,
        });
        setAppSettings((prev) => ({ ...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION }));
        if (activeSessionId) {
          setCurrentChatSettings((prev) => ({
            ...prev,
            systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
          }));
        }
        setCommandedInput({ text: '', id: Date.now(), mode: 'replace' });
        focusChatInput(0);
        return;
      }

      if (type === 'organize' && !isLiveArtifactsSystemInstruction(currentChatSettings.systemInstruction)) {
        await activateLiveArtifactsPrompt(activeSessionId);
      }

      if (type === 'follow-up' && (isAutoSendOnSuggestionClick ?? true)) {
        handleSendMessage({ text });
        return;
      }

      setCommandedInput({ text: `${text}\n`, id: Date.now() });
      focusChatInput(0);
    },
    [
      activeSessionId,
      activateLiveArtifactsPrompt,
      appSettings,
      currentLiveArtifactsPromptTargetSessionId,
      currentChatSettings.systemInstruction,
      handleSendMessage,
      isLiveArtifactsPromptActive,
      setCommandedInput,
      setAppSettings,
      setCurrentChatSettings,
    ],
  );

  return {
    handleLoadLiveArtifactsPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isLiveArtifactsPromptActive,
    isLiveArtifactsPromptBusy: liveArtifactsPromptBusy,
  };
};
