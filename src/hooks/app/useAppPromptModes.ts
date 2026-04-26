import { useCallback, useEffect, useState } from 'react';

import {
  isBboxSystemInstruction,
  isCanvasSystemInstruction,
  isHdGuideSystemInstruction,
  loadBboxSystemPrompt,
  loadCanvasSystemPrompt,
  loadHdGuideSystemPrompt,
} from '../../constants/promptHelpers';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../../constants/appConstants';
import type { AppSettings, ChatSettings, InputCommand, SavedChatSession } from '../../types';

interface PendingCanvasPromptActivation {
  systemInstruction: string;
  targetSessionId: string | null;
}

interface CanvasPromptOverrideState {
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

    const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement | null;
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
  const [pendingCanvasPromptActivation, setPendingCanvasPromptActivation] =
    useState<PendingCanvasPromptActivation | null>(null);
  const [canvasPromptBusySessionId, setCanvasPromptBusySessionId] = useState<string | null>(null);
  const [canvasPromptOverrideState, setCanvasPromptOverrideState] = useState<CanvasPromptOverrideState | null>(null);

  const currentCanvasPromptTargetSessionId = activeSessionId ?? null;
  const canvasPromptOverrideActive =
    canvasPromptOverrideState?.targetSessionId === currentCanvasPromptTargetSessionId
      ? canvasPromptOverrideState.active
      : null;
  const canvasPromptBusy = canvasPromptBusySessionId === currentCanvasPromptTargetSessionId;
  const persistedCanvasPromptActive =
    isCanvasSystemInstruction(currentChatSettings.systemInstruction) ||
    isCanvasSystemInstruction(appSettings.systemInstruction);

  const isCanvasPromptActive = canvasPromptOverrideActive ?? persistedCanvasPromptActive;

  useEffect(() => {
    if (!pendingCanvasPromptActivation) {
      return;
    }

    const pendingActivation = pendingCanvasPromptActivation;
    const targetMatches =
      pendingActivation.targetSessionId === null || pendingActivation.targetSessionId === activeSessionId;

    if (!targetMatches) {
      return;
    }

    if (activeChat && isCanvasSystemInstruction(activeChat.settings.systemInstruction)) {
      queueMicrotask(() => {
        setPendingCanvasPromptActivation((current) => (current === pendingActivation ? null : current));
      });
      return;
    }

    if (!activeSessionId || !activeChat) {
      return;
    }

    setCurrentChatSettings((prev) =>
      isCanvasSystemInstruction(prev.systemInstruction)
        ? prev
        : {
            ...prev,
            systemInstruction: pendingActivation.systemInstruction,
          },
    );

    queueMicrotask(() => {
      setPendingCanvasPromptActivation((current) => (current === pendingActivation ? null : current));
    });
  }, [activeChat, activeSessionId, pendingCanvasPromptActivation, setCurrentChatSettings]);

  useEffect(() => {
    if (
      !canvasPromptOverrideState ||
      canvasPromptOverrideState.targetSessionId !== currentCanvasPromptTargetSessionId
    ) {
      return;
    }

    const actualActive =
      isCanvasSystemInstruction(currentChatSettings.systemInstruction) ||
      isCanvasSystemInstruction(appSettings.systemInstruction);
    if (actualActive === canvasPromptOverrideState.active) {
      queueMicrotask(() => {
        setCanvasPromptOverrideState((current) =>
          current &&
          current.targetSessionId === canvasPromptOverrideState.targetSessionId &&
          current.active === canvasPromptOverrideState.active
            ? null
            : current,
        );
        setCanvasPromptBusySessionId((current) =>
          current === canvasPromptOverrideState.targetSessionId ? null : current,
        );
      });
    }
  }, [
    appSettings.systemInstruction,
    canvasPromptOverrideState,
    currentCanvasPromptTargetSessionId,
    currentChatSettings.systemInstruction,
  ]);

  const activateCanvasPrompt = useCallback(
    async (targetSessionId: string | null) => {
      const newSystemInstruction = await loadCanvasSystemPrompt(language);

      setPendingCanvasPromptActivation({
        systemInstruction: newSystemInstruction,
        targetSessionId,
      });
      setAppSettings((prev) => ({ ...prev, systemInstruction: newSystemInstruction }));

      return newSystemInstruction;
    },
    [language, setAppSettings],
  );

  const handleLoadCanvasPromptAndSave = useCallback(async () => {
    const targetSessionId = activeSessionId ?? null;

    if (canvasPromptBusy) {
      return;
    }

    const isCurrentlyCanvasPrompt = canvasPromptOverrideActive ?? persistedCanvasPromptActive;

    setCanvasPromptBusySessionId(targetSessionId);
    setCanvasPromptOverrideState({
      active: !isCurrentlyCanvasPrompt,
      targetSessionId,
    });

    try {
      if (isCurrentlyCanvasPrompt) {
        setPendingCanvasPromptActivation(null);
        setAppSettings((prev) => ({ ...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION }));
        if (activeSessionId) {
          setCurrentChatSettings((prev) => ({
            ...prev,
            systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
          }));
        }
      } else {
        await activateCanvasPrompt(targetSessionId);
      }
    } catch (error) {
      setCanvasPromptOverrideState((current) =>
        current?.targetSessionId === targetSessionId ? { active: isCurrentlyCanvasPrompt, targetSessionId } : current,
      );
      setCanvasPromptBusySessionId((current) => (current === targetSessionId ? null : current));
      throw error;
    }

    focusChatInput();
  }, [
    activateCanvasPrompt,
    activeSessionId,
    canvasPromptBusy,
    canvasPromptOverrideActive,
    persistedCanvasPromptActive,
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

      if (type === 'organize' && isCanvasPromptActive) {
        setPendingCanvasPromptActivation(null);
        setCanvasPromptOverrideState({
          active: false,
          targetSessionId: currentCanvasPromptTargetSessionId,
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

      if (type === 'organize' && !isCanvasSystemInstruction(currentChatSettings.systemInstruction)) {
        await activateCanvasPrompt(activeSessionId);
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
      activateCanvasPrompt,
      appSettings,
      currentCanvasPromptTargetSessionId,
      currentChatSettings.systemInstruction,
      handleSendMessage,
      isCanvasPromptActive,
      setCommandedInput,
      setAppSettings,
      setCurrentChatSettings,
    ],
  );

  return {
    handleLoadCanvasPromptAndSave,
    handleToggleBBoxMode,
    handleToggleGuideMode,
    handleSuggestionClick,
    isCanvasPromptActive,
    isCanvasPromptBusy: canvasPromptBusy,
  };
};
