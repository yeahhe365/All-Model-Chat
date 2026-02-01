
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
        if (activeJobs.current.size > 0 && Array.from(activeJobs.current.keys()).some(id => messages.find(m => m.id === id)?.isLoading)) {
             // Optional: concurrency check
        }
        
        if (!activeSessionId) return;

        // 1. Get Key
        const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
        if ('error' in keyResult) {
            setAppFileError(keyResult.error);
            return;
        }
        const { key: keyToUse } = keyResult;

        // 2. Prepare IDs and State
        const generationId = generateUniqueId();
        const generationStartTime = new Date();
        const newAbortController = new AbortController();

        // 3. Update State (Insert Placeholder immediately after the source message)
        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                const sourceIndex = s.messages.findIndex(m => m.id === sourceMessageId);
                // If source not found, append to end (fallback)
                const insertIndex = sourceIndex !== -1 ? sourceIndex + 1 : s.messages.length;

                const newMsg = createMessage('model', '', {
                    id: generationId,
                    isLoading: true,
                    generationStartTime,
                    excludeFromContext: true // Don't include this generated canvas message in future AI context
                });
                
                const newMessages = [...s.messages];
                newMessages.splice(insertIndex, 0, newMsg);
                
                return { ...s, messages: newMessages };
            }
            return s;
        }));

        setSessionLoading(activeSessionId, true);
        activeJobs.current.set(generationId, newAbortController);

        // Define specific settings for Canvas generation
        const canvasModelId = appSettings.autoCanvasModelId || 'gemini-3-flash-preview';
        const canvasThinkingLevel = 'HIGH';
        
        // Create a transient settings object for the stream handler to ensure accurate logging
        const canvasSettings = {
            ...currentChatSettings,
            modelId: canvasModelId,
            thinkingLevel: canvasThinkingLevel as 'HIGH',
            thinkingBudget: 0, // Ensure level is prioritized
            showThoughts: true, // Generally useful to see reasoning for complex canvas tasks
        };

        // 4. Prepare Stream Handlers
        const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(
            activeSessionId, 
            generationId, 
            newAbortController, 
            generationStartTime, 
            canvasSettings
        );

        // 5. Build Config
        const config = buildGenerationConfig(
            canvasModelId,
            CANVAS_SYSTEM_PROMPT, // Use Canvas Prompt
            { temperature: 0.7, topP: 0.95 },
            true, // Force showThoughts
            0, // Force budget 0 to use level
            false, // Disable tools for canvas generation to focus on HTML output
            false,
            false,
            canvasThinkingLevel,
            aspectRatio,
            false
        );

        // Prepare prompt with instruction
        const t = getTranslator(language);
        const promptInstruction = t('suggestion_html_desc');
        const finalPrompt = `${promptInstruction}\n\n${content}`;

        try {
            // 6. Call API (Stateless: Only send the source content as user prompt)
            await geminiServiceInstance.sendMessageStream(
                keyToUse,
                canvasModelId, // Use configured model
                [], // Empty history implies independent generation
                [{ text: finalPrompt }], // Use combined instruction + content
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
