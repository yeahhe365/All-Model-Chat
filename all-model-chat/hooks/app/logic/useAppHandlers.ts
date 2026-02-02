


import { useCallback } from 'react';
import { AppSettings, ChatSettings, ModelOption } from '../../../types';
import { DEFAULT_CHAT_SETTINGS, CANVAS_SYSTEM_PROMPT, BBOX_SYSTEM_PROMPT, DEFAULT_SYSTEM_INSTRUCTION, HD_GUIDE_SYSTEM_PROMPT } from '../../../constants/appConstants';

interface UseAppHandlersProps {
    setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    activeSessionId: string | null;
    setCurrentChatSettings: (updater: (prev: ChatSettings) => ChatSettings) => void;
    currentChatSettings: ChatSettings;
    appSettings: AppSettings;
    chatState: any; 
    t: (key: string) => string;
}

export const useAppHandlers = ({
    setAppSettings,
    activeSessionId,
    setCurrentChatSettings,
    currentChatSettings,
    appSettings,
    chatState,
    t
}: UseAppHandlersProps) => {

  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings);
    // If there is an active session, sync relevant global settings to it
    if (activeSessionId && setCurrentChatSettings) {
      setCurrentChatSettings(prevChatSettings => {
        // Start with existing session settings and reset lockedApiKey
        const nextSettings = { ...prevChatSettings, lockedApiKey: null };
        
        // Dynamically sync all chat-related settings defined in DEFAULT_CHAT_SETTINGS
        (Object.keys(DEFAULT_CHAT_SETTINGS) as Array<keyof ChatSettings>).forEach((key) => {
             if (key !== 'lockedApiKey' && key in newSettings) {
                 (nextSettings as any)[key] = (newSettings as any)[key];
             }
        });
        
        return nextSettings;
      });
    }
  }, [setAppSettings, activeSessionId, setCurrentChatSettings]);

  const handleLoadCanvasPromptAndSave = useCallback(() => {
    const isCurrentlyCanvasPrompt = currentChatSettings.systemInstruction === CANVAS_SYSTEM_PROMPT;
    const newSystemInstruction = isCurrentlyCanvasPrompt ? DEFAULT_SYSTEM_INSTRUCTION : CANVAS_SYSTEM_PROMPT;
    setAppSettings(prev => ({...prev, systemInstruction: newSystemInstruction}));
    if (activeSessionId && setCurrentChatSettings) {
        setCurrentChatSettings(prevSettings => ({ ...prevSettings, systemInstruction: newSystemInstruction }));
    }
    
    setTimeout(() => {
        const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
    }, 50);
  }, [currentChatSettings.systemInstruction, setAppSettings, activeSessionId, setCurrentChatSettings]);

  const handleToggleBBoxMode = useCallback(() => {
    const isCurrentlyBBox = currentChatSettings.systemInstruction === BBOX_SYSTEM_PROMPT;
    if (isCurrentlyBBox) {
        setAppSettings(prev => ({...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION, isCodeExecutionEnabled: false}));
        if (activeSessionId && setCurrentChatSettings) {
            setCurrentChatSettings(prev => ({ ...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION, isCodeExecutionEnabled: false }));
        }
    } else {
        setAppSettings(prev => ({...prev, systemInstruction: BBOX_SYSTEM_PROMPT, isCodeExecutionEnabled: true}));
        if (activeSessionId && setCurrentChatSettings) {
            setCurrentChatSettings(prev => ({
                ...prev,
                systemInstruction: BBOX_SYSTEM_PROMPT,
                isCodeExecutionEnabled: true
            }));
        }
    }
  }, [currentChatSettings.systemInstruction, setAppSettings, activeSessionId, setCurrentChatSettings]);

  const handleToggleGuideMode = useCallback(() => {
    const isCurrentlyGuide = currentChatSettings.systemInstruction === HD_GUIDE_SYSTEM_PROMPT;
    if (isCurrentlyGuide) {
        setAppSettings(prev => ({...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION, isCodeExecutionEnabled: false}));
        if (activeSessionId && setCurrentChatSettings) {
            setCurrentChatSettings(prev => ({ ...prev, systemInstruction: DEFAULT_SYSTEM_INSTRUCTION, isCodeExecutionEnabled: false }));
        }
    } else {
        setAppSettings(prev => ({...prev, systemInstruction: HD_GUIDE_SYSTEM_PROMPT, isCodeExecutionEnabled: true}));
        if (activeSessionId && setCurrentChatSettings) {
            setCurrentChatSettings(prev => ({
                ...prev,
                systemInstruction: HD_GUIDE_SYSTEM_PROMPT,
                isCodeExecutionEnabled: true
            }));
        }
    }
  }, [currentChatSettings.systemInstruction, setAppSettings, activeSessionId, setCurrentChatSettings]);
  
  const handleSuggestionClick = useCallback((type: 'homepage' | 'organize' | 'follow-up', text: string) => {
    const { isAutoSendOnSuggestionClick } = appSettings;
    const { handleSendMessage, setCommandedInput } = chatState;

    if (type === 'organize') {
        if (currentChatSettings.systemInstruction !== CANVAS_SYSTEM_PROMPT) {
            const newSystemInstruction = CANVAS_SYSTEM_PROMPT;
            setAppSettings(prev => ({...prev, systemInstruction: newSystemInstruction}));
            if (activeSessionId && setCurrentChatSettings) {
                setCurrentChatSettings(prevSettings => ({ ...prevSettings, systemInstruction: newSystemInstruction }));
            }
        }
    }
    if (type === 'follow-up' && (isAutoSendOnSuggestionClick ?? true)) {
        handleSendMessage({ text });
    } else {
        setCommandedInput({ text: text + '\n', id: Date.now() });
        setTimeout(() => {
            const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
            if (textarea) textarea.focus();
        }, 0);
    }
  }, [currentChatSettings.systemInstruction, appSettings, chatState, setAppSettings, activeSessionId, setCurrentChatSettings]);

  const handleSetThinkingLevel = useCallback((level: 'LOW' | 'HIGH') => {
    setAppSettings(prev => ({ ...prev, thinkingLevel: level }));
    if (activeSessionId && setCurrentChatSettings) {
        setCurrentChatSettings(prev => ({ ...prev, thinkingLevel: level }));
    }
    setTimeout(() => {
        const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
    }, 50);
  }, [setAppSettings, activeSessionId, setCurrentChatSettings]);

  const getCurrentModelDisplayName = useCallback(() => {
    const { apiModels, isSwitchingModel } = chatState;
    const modelIdToDisplay = currentChatSettings.modelId || appSettings.modelId;
    if (isSwitchingModel) return t('appSwitchingModel');
    const model = apiModels.find((m: ModelOption) => m.id === modelIdToDisplay);
    if (model) return model.name;
    if (modelIdToDisplay) { 
        let n = modelIdToDisplay.split('/').pop()?.replace('gemini-','Gemini ') || modelIdToDisplay; 
        return n.split('-').map((w: string)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ').replace(' Preview ',' Preview ');
    }
    return apiModels.length === 0 ? t('appNoModelsAvailable') : t('appNoModelSelected');
  }, [currentChatSettings.modelId, appSettings.modelId, chatState, t]);

  return {
      handleSaveSettings,
      handleLoadCanvasPromptAndSave,
      handleToggleBBoxMode,
      handleToggleGuideMode,
      handleSuggestionClick,
      handleSetThinkingLevel,
      getCurrentModelDisplayName
  };
};