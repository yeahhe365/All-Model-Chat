
import React, { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession } from '../../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import { createNewSession, cacheModelSettings, getCachedModelSettings, adjustThinkingBudget } from '../../../utils/appUtils';
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

        // 4. Validating range compatibility using shared helper
        newThinkingBudget = adjustThinkingBudget(modelId, newThinkingBudget);

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

        // Auto-focus input after model selection
        setTimeout(() => {
            const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
            if (textarea) {
                textarea.focus();
            }
        }, 50);
    }, [isLoading, currentChatSettings, updateAndPersistSessions, activeSessionId, userScrolledUp, handleStopGenerating, appSettings, setActiveSessionId, setCurrentChatSettings, setIsSwitchingModel]);

    return { handleSelectModelInHeader };
};
