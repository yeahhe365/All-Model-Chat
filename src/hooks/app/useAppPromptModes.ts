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

interface UseAppPromptModesOptions {
  appSettings: {
    isAutoSendOnSuggestionClick?: boolean;
  };
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  activeChat: SavedChatSession | undefined;
  activeSessionId: string | null;
  currentChatSettings: ChatSettings;
  setCurrentChatSettings: (updater: (prev: ChatSettings) => ChatSettings) => void;
  handleSendMessage: (args: { text: string }) => void;
  setCommandedInput: (command: InputCommand) => void;
}

const focusChatInput = () => {
  setTimeout(() => {
    const textarea = document.querySelector(
      'textarea[aria-label="Chat message input"]',
    ) as HTMLTextAreaElement | null;
    textarea?.focus();
  }, 50);
};

export const useAppPromptModes = ({
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
  const [canvasPromptBusy, setCanvasPromptBusy] = useState(false);
  const [canvasPromptOverrideActive, setCanvasPromptOverrideActive] = useState<boolean | null>(null);

  const isCanvasPromptActive =
    canvasPromptOverrideActive ?? isCanvasSystemInstruction(currentChatSettings.systemInstruction);

  useEffect(() => {
    if (!pendingCanvasPromptActivation) {
      return;
    }

    const pendingActivation = pendingCanvasPromptActivation;
    const targetMatches =
      pendingActivation.targetSessionId === null ||
      pendingActivation.targetSessionId === activeSessionId;

    if (!targetMatches) {
      return;
    }

    if (activeChat && isCanvasSystemInstruction(activeChat.settings.systemInstruction)) {
      queueMicrotask(() => {
        setPendingCanvasPromptActivation((current) =>
          current === pendingActivation ? null : current,
        );
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
      setPendingCanvasPromptActivation((current) =>
        current === pendingActivation ? null : current,
      );
    });
  }, [activeChat, activeSessionId, pendingCanvasPromptActivation, setCurrentChatSettings]);

  useEffect(() => {
    if (canvasPromptOverrideActive === null) {
      return;
    }

    const actualActive = isCanvasSystemInstruction(currentChatSettings.systemInstruction);
    if (actualActive === canvasPromptOverrideActive) {
      queueMicrotask(() => {
        setCanvasPromptOverrideActive((current) =>
          current === canvasPromptOverrideActive ? null : current,
        );
        setCanvasPromptBusy(false);
      });
    }
  }, [canvasPromptOverrideActive, currentChatSettings.systemInstruction]);

  const activateCanvasPrompt = useCallback(
    async (targetSessionId: string | null) => {
      const newSystemInstruction = await loadCanvasSystemPrompt();

      setPendingCanvasPromptActivation({
        systemInstruction: newSystemInstruction,
        targetSessionId,
      });
      setAppSettings((prev) => ({ ...prev, systemInstruction: newSystemInstruction }));

      if (targetSessionId && activeChat && activeSessionId === targetSessionId) {
        setCurrentChatSettings((prev) => ({
          ...prev,
          systemInstruction: newSystemInstruction,
        }));
      }

      return newSystemInstruction;
    },
    [activeChat, activeSessionId, setAppSettings, setCurrentChatSettings],
  );

  const handleLoadCanvasPromptAndSave = useCallback(async () => {
    if (canvasPromptBusy) {
      return;
    }

    const isCurrentlyCanvasPrompt =
      canvasPromptOverrideActive ?? isCanvasSystemInstruction(currentChatSettings.systemInstruction);

    setCanvasPromptBusy(true);
    setCanvasPromptOverrideActive(!isCurrentlyCanvasPrompt);

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
        await activateCanvasPrompt(activeSessionId);
      }
    } catch (error) {
      setCanvasPromptOverrideActive(isCurrentlyCanvasPrompt);
      setCanvasPromptBusy(false);
      throw error;
    }

    focusChatInput();
  }, [
    activateCanvasPrompt,
    activeSessionId,
    canvasPromptBusy,
    canvasPromptOverrideActive,
    currentChatSettings.systemInstruction,
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

      if (
        type === 'organize' &&
        !isCanvasSystemInstruction(currentChatSettings.systemInstruction)
      ) {
        await activateCanvasPrompt(activeSessionId);
      }

      if (type === 'follow-up' && (isAutoSendOnSuggestionClick ?? true)) {
        handleSendMessage({ text });
        return;
      }

      setCommandedInput({ text: `${text}\n`, id: Date.now() });
      setTimeout(() => {
        const textarea = document.querySelector(
          'textarea[aria-label="Chat message input"]',
        ) as HTMLTextAreaElement | null;
        textarea?.focus();
      }, 0);
    },
    [
      activeSessionId,
      activateCanvasPrompt,
      appSettings,
      currentChatSettings.systemInstruction,
      handleSendMessage,
      setCommandedInput,
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
