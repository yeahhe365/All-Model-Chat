import { useState, useEffect } from 'react';
import { PreloadedMessage, ChatMessage, SavedScenario, SavedChatSession } from '../types';
import { PRELOADED_SCENARIO_KEY } from '../constants/appConstants';
import { generateUniqueId, generateSessionTitle } from '../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface PreloadedScenariosProps {
    startNewChat: () => void;
    updateAndPersistSessions: SessionsUpdater;
}

export const usePreloadedScenarios = ({ startNewChat, updateAndPersistSessions }: PreloadedScenariosProps) => {
    const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);

    useEffect(() => {
        try {
            const storedScenarios = localStorage.getItem(PRELOADED_SCENARIO_KEY);
            if (storedScenarios) {
                const parsed = JSON.parse(storedScenarios);
                // Basic validation
                if (Array.isArray(parsed) && parsed.every(s => s.id && s.title && Array.isArray(s.messages))) {
                    setSavedScenarios(parsed);
                }
            }
        } catch (error) { console.error("Error loading preloaded scenarios:", error); }
    }, []);
    
    const handleSaveAllScenarios = (updatedScenarios: SavedScenario[]) => { 
        setSavedScenarios(updatedScenarios); 
        localStorage.setItem(PRELOADED_SCENARIO_KEY, JSON.stringify(updatedScenarios)); 
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

    const handleExportPreloadedScenario = (scenarioToExport: SavedScenario) => { 
        const jsonString = JSON.stringify([scenarioToExport.messages], null, 2); 
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const sanitizedTitle = scenarioToExport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `scenario_${sanitizedTitle || 'export'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    const handleImportPreloadedScenario = (file: File): Promise<SavedScenario | null> => new Promise((resolve) => { 
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedMessages = JSON.parse(e.target?.result as string);
                
                let messages: PreloadedMessage[];
                if (Array.isArray(parsedMessages) && parsedMessages.length > 0 && Array.isArray(parsedMessages[0])) {
                     messages = parsedMessages[0];
                } else {
                     messages = parsedMessages;
                }

                if (Array.isArray(messages) && messages.every(m => m.id && m.role && typeof m.content === 'string')) {
                    const scenarioTitle = file.name.replace(/\.json$/i, '');
                    resolve({
                        id: generateUniqueId(),
                        title: scenarioTitle,
                        messages: messages
                    });
                } else {
                    resolve(null);
                }
            } catch (err) {
                console.error("Import parsing error:", err);
                resolve(null);
            }
        };
        reader.onerror = () => {
            resolve(null);
        };
        reader.readAsText(file);
    });

    return {
        savedScenarios,
        handleSaveAllScenarios,
        handleLoadPreloadedScenario,
        handleExportPreloadedScenario,
        handleImportPreloadedScenario
    };
};
