
import React, { useCallback } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession } from '../../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
import { createNewSession, cacheModelSettings, getCachedModelSettings, adjustThinkingBudget } from '../../../utils/appUtils';
import { MediaResolution } from '../../../types/settings';
import { useWindowContext } from '../../../contexts/useWindowContext';

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
    const { document: targetDocument } = useWindowContext();

    const focusChatInput = useCallback(() => {
        const textarea = targetDocument.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement | null;
        textarea?.focus();
    }, [targetDocument]);

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
        userScrolledUpRef.current = false;

        // Auto-focus input after model selection
        setTimeout(() => {
            focusChatInput();
        }, 50);
    }, [isLoading, currentChatSettings, updateAndPersistSessions, activeSessionId, userScrolledUpRef, handleStopGenerating, appSettings, setActiveSessionId, setCurrentChatSettings, setIsSwitchingModel, focusChatInput]);

    return { handleSelectModelInHeader };
};
