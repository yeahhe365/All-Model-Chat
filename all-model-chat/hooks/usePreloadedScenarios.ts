import { useState, useEffect, Dispatch, SetStateAction, useMemo } from 'react';
import { PreloadedMessage, ChatMessage, SavedScenario, SavedChatSession, AppSettings } from '../types';
import { generateUniqueId, generateSessionTitle, logService } from '../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS, DEFAULT_SYSTEM_INSTRUCTION } from '../constants/appConstants';
import { FOP_SYSTEM_PROMPT } from '../constants/specialPrompts';
import { dbService } from '../utils/db';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;

interface PreloadedScenariosProps {
    appSettings: AppSettings;
    setAppSettings: Dispatch<SetStateAction<AppSettings>>;
    updateAndPersistSessions: SessionsUpdater;
    setActiveSessionId: Dispatch<SetStateAction<string | null>>;
}

const fopScenario: SavedScenario = {
    id: 'fop-scenario-default',
    title: 'FOP Mode',
    messages: [],
    systemInstruction: FOP_SYSTEM_PROMPT,
};

export const usePreloadedScenarios = ({ appSettings, setAppSettings, updateAndPersistSessions, setActiveSessionId }: PreloadedScenariosProps) => {
    const [userSavedScenarios, setUserSavedScenarios] = useState<SavedScenario[]>([]);

    useEffect(() => {
        const loadScenarios = async () => {
            try {
                const storedScenarios = await dbService.getAllScenarios();
                setUserSavedScenarios(storedScenarios);
            } catch (error) {
                logService.error("Error loading preloaded scenarios:", { error });
            }
        };
        loadScenarios();
    }, []);
    
    const savedScenarios = useMemo(() => {
        // Ensure user-saved scenarios don't conflict with the default FOP ID
        const filteredUserScenarios = userSavedScenarios.filter(s => s.id !== fopScenario.id);
        return [fopScenario, ...filteredUserScenarios];
    }, [userSavedScenarios]);

    const handleSaveAllScenarios = (updatedScenarios: SavedScenario[]) => { 
        // Filter out the default FOP scenario so it's not saved to the user's database
        const scenariosToSave = updatedScenarios.filter(s => s.id !== fopScenario.id);
        setUserSavedScenarios(scenariosToSave); 
        dbService.setAllScenarios(scenariosToSave).catch(error => {
            logService.error("Failed to save scenarios to DB", { error });
        });
    };
    
    const handleLoadPreloadedScenario = (scenarioToLoad: SavedScenario) => {
        const messages: ChatMessage[] = scenarioToLoad.messages.map(pm => ({
            ...pm,
            id: generateUniqueId(),
            timestamp: new Date()
        }));

        const systemInstruction = scenarioToLoad.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION;

        // Create a new session from scratch with the scenario's data
        const newSession: SavedChatSession = {
            id: generateUniqueId(),
            title: scenarioToLoad.title || generateSessionTitle(messages) || 'New Chat',
            messages,
            settings: {
                ...DEFAULT_CHAT_SETTINGS, // Start with defaults
                ...appSettings,          // Layer on current app settings
                systemInstruction,       // Override with scenario's system instruction
            },
            timestamp: Date.now(),
        };

        updateAndPersistSessions(prev => [newSession, ...prev.filter(s => s.messages.length > 0)]);
        setActiveSessionId(newSession.id);
        dbService.setActiveSessionId(newSession.id);

        // Also update the global/default system prompt in app settings
        setAppSettings(prev => ({
            ...prev,
            systemInstruction,
        }));
    };

    return {
        savedScenarios,
        handleSaveAllScenarios,
        handleLoadPreloadedScenario,
    };
};