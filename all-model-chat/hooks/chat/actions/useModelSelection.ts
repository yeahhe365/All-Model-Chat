
import React, { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession } from '../../../types';
import { DEFAULT_CHAT_SETTINGS, THINKING_BUDGET_RANGES, MODELS_MANDATORY_THINKING } from '../../../constants/appConstants';
import { createNewSession, cacheModelSettings, getCachedModelSettings } from '../../../utils/appUtils';
import { MediaResolution } from '../../../types/settings';

interface UseModelSelectionProps {
    appSettings: AppSettings;
    activeSessionId: string | null;
    currentChatSettings: IndividualChatSettings;
    isLoading: boolean;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    setActiveSessionId: (id: string | null) => void;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
    setIsSwitchingModel: (switching: boolean) => void;
    handleStopGenerating: () => void;
    userScrolledUp: React.MutableRefObject<boolean>;
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
    userScrolledUp,
}: UseModelSelectionProps) => {

    const handleSelectModelInHeader = useCallback((modelId: string) => {
        // Resolve target settings based on context (Session vs Global)
        const sourceSettings = activeSessionId ? currentChatSettings : appSettings;
        
        // 1. Cache CURRENT model settings before switching
        if (currentChatSettings.modelId) {
            cacheModelSettings(currentChatSettings.modelId, { 
                mediaResolution: currentChatSettings.mediaResolution,
                thinkingBudget: currentChatSettings.thinkingBudget,
                thinkingLevel: currentChatSettings.thinkingLevel
            });
        }

        // 2. Retrieve CACHED settings for NEW model
        const cached = getCachedModelSettings(modelId);

        // 3. Determine new settings
        const newMediaResolution = cached?.mediaResolution ?? sourceSettings.mediaResolution ?? MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED;
        let newThinkingBudget = cached?.thinkingBudget ?? sourceSettings.thinkingBudget;
        const newThinkingLevel = cached?.thinkingLevel ?? sourceSettings.thinkingLevel;

        // 4. Validating range compatibility for the new model
        const range = THINKING_BUDGET_RANGES[modelId];
        if (range) {
            const isGemini3 = modelId.includes('gemini-3');
            const isMandatory = MODELS_MANDATORY_THINKING.includes(modelId);

            // Case A: Mandatory Thinking Check
            // If the new model requires thinking but it's currently disabled (0), force it ON.
            if (isMandatory && newThinkingBudget === 0) {
                // For Gemini 3, -1 means "Use Level" (Auto), which is a safe default.
                // For non-Gemini 3 (e.g. 2.5), we default to max capability.
                newThinkingBudget = isGemini3 ? -1 : range.max;
            }

            // Case B: Auto (-1) Compatibility for non-G3 models
            // Non-Gemini 3 models (like 2.5) typically need explicit budgets and don't support "Level".
            // If carrying over -1 (Auto), convert to a concrete budget (Max).
            if (!isGemini3 && newThinkingBudget === -1) {
                newThinkingBudget = range.max;
            }

            // Case C: Range Clamping for concrete budgets
            if (newThinkingBudget > 0) {
                if (newThinkingBudget > range.max) newThinkingBudget = range.max;
                if (newThinkingBudget < range.min) newThinkingBudget = range.min;
            }
        }

        const newSettingsPartial: Partial<IndividualChatSettings> = {
            modelId,
            thinkingBudget: newThinkingBudget,
            thinkingLevel: newThinkingLevel,
            mediaResolution: newMediaResolution,
        };

        if (!activeSessionId) {
            const sessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...newSettingsPartial };
            const newSession = createNewSession(sessionSettings);
            
            updateAndPersistSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
        } else {
            if (isLoading) handleStopGenerating();
            if (modelId !== currentChatSettings.modelId) {
                setIsSwitchingModel(true);
                updateAndPersistSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, settings: { ...s.settings, ...newSettingsPartial } } : s));
            } else {
                // If model is same but somehow we are updating params (rare here)
                if (currentChatSettings.thinkingBudget !== newThinkingBudget || currentChatSettings.thinkingLevel !== newThinkingLevel) {
                    setCurrentChatSettings(prev => ({
                        ...prev, 
                        thinkingBudget: newThinkingBudget, 
                        thinkingLevel: newThinkingLevel
                    }));
                }
            }
        }
        userScrolledUp.current = false;
    }, [isLoading, currentChatSettings, updateAndPersistSessions, activeSessionId, userScrolledUp, handleStopGenerating, appSettings, setActiveSessionId, setCurrentChatSettings, setIsSwitchingModel]);

    return { handleSelectModelInHeader };
};
