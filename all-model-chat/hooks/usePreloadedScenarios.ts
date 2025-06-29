import { useState, useEffect } from 'react';
import { PreloadedMessage, ChatMessage } from '../types';
import { PRELOADED_SCENARIO_KEY } from '../constants/appConstants';
import { generateUniqueId } from '../utils/appUtils';

interface PreloadedScenariosProps {
    startNewChat: (saveCurrent: boolean) => void;
    setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
}

export const usePreloadedScenarios = ({ startNewChat, setMessages }: PreloadedScenariosProps) => {
    const [preloadedMessages, setPreloadedMessages] = useState<PreloadedMessage[]>([]);

    useEffect(() => {
        try {
            const storedScenario = localStorage.getItem(PRELOADED_SCENARIO_KEY);
            if (storedScenario) setPreloadedMessages(JSON.parse(storedScenario));
        } catch (error) { console.error("Error loading preloaded scenario:", error); }
    }, []);
    
    const handleSavePreloadedScenario = (updatedScenario: PreloadedMessage[]) => { 
        setPreloadedMessages(updatedScenario); 
        localStorage.setItem(PRELOADED_SCENARIO_KEY, JSON.stringify(updatedScenario)); 
    };
    
    const handleLoadPreloadedScenario = (scenarioToLoad: PreloadedMessage[]) => { 
        startNewChat(true); 
        setMessages(() => scenarioToLoad.map(pm => ({ ...pm, id: generateUniqueId(), timestamp: new Date() }))); 
    };

    const handleExportPreloadedScenario = (scenarioToExport: PreloadedMessage[]) => { 
        const j = JSON.stringify(scenarioToExport, null, 2); 
        const b = new Blob([j],{type:"application/json"}); 
        const u = URL.createObjectURL(b); 
        const a = document.createElement("a"); 
        a.href=u; 
        a.download="chat-scenario.json"; 
        a.click(); 
        URL.revokeObjectURL(u); 
    };
    
    const handleImportPreloadedScenario = (file: File): Promise<PreloadedMessage[] | null> => new Promise((resolve) => { 
        const r=new FileReader(); 
        r.onload=(e)=>{
            try {
                const p=JSON.parse(e.target?.result as string); 
                if(Array.isArray(p) && p.every(m => m.id && m.role && typeof m.content === 'string')){
                    resolve(p as PreloadedMessage[]);
                } else {
                    resolve(null);
                }
            } catch(err){
                resolve(null);
            }
        }; 
        r.onerror=()=>{
            resolve(null);
        }; 
        r.readAsText(file);
    });

    return {
        preloadedMessages,
        handleSavePreloadedScenario,
        handleLoadPreloadedScenario,
        handleExportPreloadedScenario,
        handleImportPreloadedScenario
    };
};
