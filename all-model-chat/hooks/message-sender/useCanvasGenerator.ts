
import { useCallback } from 'react';
import { generateUniqueId, getKeyForRequest, getTranslator, createMessage } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { CANVAS_SYSTEM_PROMPT } from '../../constants/appConstants';
import { buildGenerationConfig } from '../../services/api/baseApi';
import { ChatMessage } from '../../types';
import { CanvasGeneratorProps } from './types';

export const useCanvasGenerator = ({
    appSettings,
    currentChatSettings,
    messages,
    activeSessionId,
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
    getStreamHandlers,
    setAppFileError,
    aspectRatio,
    language
}: CanvasGeneratorProps) => {

    const handleGenerateCanvas = useCallback(async (sourceMessageId: string, content: string) => {
        if (!activeSessionId) return;

        const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
        if ('error' in keyResult) {
            setAppFileError(keyResult.error);
            return;
        }
        const { key: keyToUse } = keyResult;

        const generationId = generateUniqueId();
        const generationStartTime = new Date();
        const newAbortController = new AbortController();

        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                const sourceIndex = s.messages.findIndex(m => m.id === sourceMessageId);
                const insertIndex = sourceIndex !== -1 ? sourceIndex + 1 : s.messages.length;

                const newMsg = createMessage('model', '', {
                    id: generationId,
                    isLoading: true,
                    generationStartTime,
                    excludeFromContext: true 
                });
                
                const newMessages = [...s.messages];
                newMessages.splice(insertIndex, 0, newMsg);
                
                return { ...s, messages: newMessages };
            }
            return s;
        }));

        setSessionLoading(activeSessionId, true);
        activeJobs.current.set(generationId, newAbortController);

        const canvasModelId = appSettings.autoCanvasModelId || 'gemini-3-flash-preview';
        const canvasThinkingLevel = 'HIGH';
        
        const canvasSettings = {
            ...currentChatSettings,
            modelId: canvasModelId,
            thinkingLevel: canvasThinkingLevel as 'HIGH',
            thinkingBudget: 0,
            showThoughts: true,
        };

        const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(
            activeSessionId, 
            generationId, 
            newAbortController, 
            generationStartTime, 
            canvasSettings
        );

        const config = buildGenerationConfig(
            canvasModelId,
            CANVAS_SYSTEM_PROMPT,
            { temperature: 0.7, topP: 0.95 },
            true,
            0,
            false,
            false,
            false,
            canvasThinkingLevel,
            aspectRatio,
            false
        );

        const t = getTranslator(language);
        const promptInstruction = t('suggestion_html_desc');
        const finalPrompt = `${promptInstruction}\n\n${content}`;

        try {
            await geminiServiceInstance.sendMessageStream(
                keyToUse,
                canvasModelId,
                [],
                [{ text: finalPrompt }],
                config,
                newAbortController.signal,
                streamOnPart,
                onThoughtChunk,
                streamOnError,
                streamOnComplete
            );
        } catch (error) {
            streamOnError(error instanceof Error ? error : new Error(String(error)));
        }

    }, [appSettings, currentChatSettings, activeSessionId, updateAndPersistSessions, setSessionLoading, activeJobs, getStreamHandlers, setAppFileError, aspectRatio, messages, language]);

    return { handleGenerateCanvas };
};
