import { useState, useEffect } from 'react';
import { PreloadedMessage, ChatMessage, SavedScenario, SavedChatSession } from '../types';
import { generateUniqueId, generateSessionTitle, logService } from '../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { dbService } from '../utils/db';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => Promise<void>;

interface PreloadedScenariosProps {
    startNewChat: () => void;
    updateAndPersistSessions: SessionsUpdater;
}

export const usePreloadedScenarios = ({ startNewChat, updateAndPersistSessions }: PreloadedScenariosProps) => {
    const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);

    useEffect(() => {
        const loadScenarios = async () => {
            try {
                const storedScenarios = await dbService.getAllScenarios();
                setSavedScenarios(storedScenarios);
            } catch (error) {
                logService.error("Error loading preloaded scenarios:", { error });
            }
        };
        loadScenarios();
    }, []);
    
    const handleSaveAllScenarios = (updatedScenarios: SavedScenario[]) => { 
        setSavedScenarios(updatedScenarios); 
        dbService.setAllScenarios(updatedScenarios).catch(error => {
            logService.error("Failed to save scenarios to DB", { error });
        });
    };
    
    const handleLoadPreloadedScenario = (scenarioToLoad: PreloadedMessage[]) => { 
        startNewChat(); 
        const messages: ChatMessage[] = scenarioToLoad.map(pm => ({ ...pm, id: generateUniqueId(), timestamp: new Date() }));
        const newSession: SavedChatSession = {
            id: generateUniqueId(),
            title: generateSessionTitle(messages),
            messages,
            settings: DEFAULT_CHAT_SETTINGS,
            timestamp: Date.now(),
        };
        updateAndPersistSessions(prev => [newSession, ...prev]);
        // The active session will be set by the calling component, if desired.
        // For now, it just adds it to the list.
    };

    return {
        savedScenarios,
        handleSaveAllScenarios,
        handleLoadPreloadedScenario,
    };
};