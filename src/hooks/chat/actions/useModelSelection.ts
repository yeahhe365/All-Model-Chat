import React, { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession } from '../../../types';
import { CHAT_INPUT_TEXTAREA_SELECTOR, DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import { createNewSession } from '../../../utils/chat/session';
import { resolveModelSwitchSettings } from '../../../utils/modelHelpers';

interface UseModelSelectionProps {
  appSettings: AppSettings;
  activeSessionId: string | null;
  currentChatSettings: IndividualChatSettings;
  isLoading: boolean;
  updateAndPersistSessions: (
    updater: (prev: SavedChatSession[]) => SavedChatSession[],
    options?: { persist?: boolean },
  ) => void;
  setActiveSessionId: (id: string | null) => void;
  setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
  setIsSwitchingModel: (switching: boolean) => void;
  handleStopGenerating: () => void;
  userScrolledUpRef: React.MutableRefObject<boolean>;
}

export const useModelSelection = ({
  appSettings,
  activeSessionId,
  currentChatSettings,
  isLoading,
  updateAndPersistSessions,
  setActiveSessionId,
  setCurrentChatSettings,
  setIsSwitchingModel,
  handleStopGenerating,
  userScrolledUpRef,
}: UseModelSelectionProps) => {
  const handleSelectModelInHeader = useCallback(
    (modelId: string) => {
      // Resolve target settings based on context (Session vs Global)
      const sourceSettings = activeSessionId ? currentChatSettings : appSettings;
      const newSettingsPartial: Partial<IndividualChatSettings> = resolveModelSwitchSettings({
        currentSettings: currentChatSettings,
        sourceSettings,
        targetModelId: modelId,
      });

      if (!activeSessionId) {
        const sessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...newSettingsPartial };
        const newSession = createNewSession(sessionSettings);

        updateAndPersistSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
      } else {
        if (isLoading) handleStopGenerating();
        if (modelId !== currentChatSettings.modelId) {
          setIsSwitchingModel(true);
          updateAndPersistSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId ? { ...s, settings: { ...s.settings, ...newSettingsPartial } } : s,
            ),
          );
        } else {
          // If model is same but somehow we are updating params (rare here)
          if (
            currentChatSettings.thinkingBudget !== newSettingsPartial.thinkingBudget ||
            currentChatSettings.thinkingLevel !== newSettingsPartial.thinkingLevel
          ) {
            setCurrentChatSettings((prev) => ({
              ...prev,
              thinkingBudget: newSettingsPartial.thinkingBudget ?? prev.thinkingBudget,
              thinkingLevel: newSettingsPartial.thinkingLevel,
            }));
          }
        }
      }
      userScrolledUpRef.current = false;

      // Auto-focus input after model selection
      setTimeout(() => {
        const textarea = document.querySelector(CHAT_INPUT_TEXTAREA_SELECTOR) as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }, 50);
    },
    [
      isLoading,
      currentChatSettings,
      updateAndPersistSessions,
      activeSessionId,
      userScrolledUpRef,
      handleStopGenerating,
      appSettings,
      setActiveSessionId,
      setCurrentChatSettings,
      setIsSwitchingModel,
    ],
  );

  return { handleSelectModelInHeader };
};
