import { useState, useEffect } from 'react';
import { PreloadedMessage, ChatMessage, SavedScenario } from '../types';
import { PRELOADED_SCENARIO_KEY } from '../constants/appConstants';
import { generateUniqueId } from '../utils/appUtils';

interface PreloadedScenariosProps {
    startNewChat: (saveCurrent: boolean) => void;
    setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
}

export const usePreloadedScenarios = ({ startNewChat, setMessages }: PreloadedScenariosProps) => {
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
        startNewChat(false); // Don't save the current (modal) state, just start fresh
        setMessages(() => scenarioToLoad.map(pm => ({ ...pm, id: generateUniqueId(), timestamp: new Date() }))); 
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
                
                // Handle both old format (array of messages) and new format (array of array of messages)
                let messages: PreloadedMessage[];
                if (Array.isArray(parsedMessages) && parsedMessages.length > 0 && Array.isArray(parsedMessages[0])) {
                     messages = parsedMessages[0]; // New format from this tool
                } else {
                     messages = parsedMessages; // Old format or external format
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