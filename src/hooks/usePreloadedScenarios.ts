
import { useState, useEffect, Dispatch, SetStateAction, useMemo } from 'react';
import { ChatMessage, SavedScenario, SavedChatSession, AppSettings } from '../types';
import { generateUniqueId, generateSessionTitle, logService, createNewSession } from '../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS, DEFAULT_SYSTEM_INSTRUCTION } from '../constants/appConstants';
import { dbService } from '../utils/db';
import { 
    fopScenario, 
    unrestrictedScenario, 
    pyriteScenario, 
    annaScenario, 
    voxelScenario, 
    reasonerScenario, 
    succinctScenario, 
    socraticScenario, 
    formalScenario,
    SYSTEM_SCENARIO_IDS 
} from '../constants/defaultScenarios';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;

interface PreloadedScenariosProps {
    appSettings: AppSettings;
    setAppSettings: Dispatch<SetStateAction<AppSettings>>;
    updateAndPersistSessions: SessionsUpdater;
    setActiveSessionId: Dispatch<SetStateAction<string | null>>;
}

export const usePreloadedScenarios = ({ appSettings, setAppSettings, updateAndPersistSessions, setActiveSessionId }: PreloadedScenariosProps) => {
    const [userSavedScenarios, setUserSavedScenarios] = useState<SavedScenario[]>([]);

    useEffect(() => {
        const loadScenarios = async () => {
            try {
                const storedScenarios = await dbService.getAllScenarios();
                let scenariosToSet = storedScenarios;

                // 2. Seed Jailbreak Scenarios (FOP, Pyrite, Unrestricted) as User Scenarios
                const hasSeededJailbreaks = localStorage.getItem('hasSeededJailbreaks_v1');
                if (!hasSeededJailbreaks) {
                    const jailbreaks = [fopScenario, unrestrictedScenario, pyriteScenario];
                    // Append if not already present by ID
                    const newScenarios = jailbreaks.filter(jb => !scenariosToSet.some(s => s.id === jb.id));
                    if (newScenarios.length > 0) {
                        scenariosToSet = [...scenariosToSet, ...newScenarios];
                    }
                }

                // 3. Seed Anna Scenario (v1 check)
                const hasSeededAnna = localStorage.getItem('hasSeededAnna_v1');
                if (!hasSeededAnna) {
                    const anna = [annaScenario];
                    const newScenarios = anna.filter(a => !scenariosToSet.some(s => s.id === a.id));
                    if (newScenarios.length > 0) {
                        scenariosToSet = [...scenariosToSet, ...newScenarios];
                    }
                }

                // Save if any changes were made
                if (!hasSeededJailbreaks || !hasSeededAnna) {
                    await dbService.setAllScenarios(scenariosToSet);
                    if (!hasSeededJailbreaks) localStorage.setItem('hasSeededJailbreaks_v1', 'true');
                    if (!hasSeededAnna) localStorage.setItem('hasSeededAnna_v1', 'true');
                }

                setUserSavedScenarios(scenariosToSet);
            } catch (error) {
                logService.error("Error loading preloaded scenarios:", { error });
            }
        };
        loadScenarios();
    }, []);
    
    const savedScenarios = useMemo(() => {
        // Ensure user-saved scenarios don't conflict with the default IDs
        const filteredUserScenarios = userSavedScenarios.filter(s => !SYSTEM_SCENARIO_IDS.includes(s.id));
        return [
            // FOP, Unrestricted, Pyrite, Anna are now in filteredUserScenarios
            voxelScenario,
            reasonerScenario,
            succinctScenario, 
            socraticScenario, 
            formalScenario, 
            ...filteredUserScenarios
        ];
    }, [userSavedScenarios]);

    const handleSaveAllScenarios = (updatedScenarios: SavedScenario[]) => { 
        // Filter out the default scenarios so they are not saved to the user's database
        const scenariosToSave = updatedScenarios.filter(s => !SYSTEM_SCENARIO_IDS.includes(s.id));
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
        const sessionSettings = {
            ...DEFAULT_CHAT_SETTINGS, // Start with defaults
            ...appSettings,          // Layer on current app settings
            systemInstruction,       // Override with scenario's system instruction
        };

        const title = scenarioToLoad.title || generateSessionTitle(messages) || 'New Chat';
        
        const newSession = createNewSession(sessionSettings, messages, title);

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
