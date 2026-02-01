
import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings } from '../../types';
import { useApiErrorHandler } from './useApiErrorHandler';
import { geminiServiceInstance } from '../../services/geminiService';
import { generateUniqueId, buildContentParts, createChatHistoryForApi, logService, performOptimisticSessionUpdate, createMessage, createUploadedFileFromBase64, generateSessionTitle } from '../../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { Part } from '@google/genai';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface ImageEditSenderProps {
    updateAndPersistSessions: SessionsUpdater;
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setActiveSessionId: (id: string | null) => void;
}

export const useImageEditSender = ({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
    setActiveSessionId,
}: ImageEditSenderProps) => {
    const { handleApiError } = useApiErrorHandler(updateAndPersistSessions);
    
    const handleImageEditMessage = useCallback(async (
        keyToUse: string,
        activeSessionId: string | null,
        messages: ChatMessage[],
        generationId: string,
        newAbortController: AbortController,
        appSettings: AppSettings,
        currentChatSettings: IndividualChatSettings,
        text: string,
        files: UploadedFile[],
        effectiveEditingId: string | null,
        aspectRatio: string,
        imageSize: string | undefined,
        options: { shouldLockKey?: boolean } = {}
    ) => {
        const modelMessageId = generationId;
        const imageFiles = files.filter(f => f.type.startsWith('image/'));

        const finalSessionId = activeSessionId || generateUniqueId();
        
        const userMessage = createMessage('user', text, { files });
        const modelMessage = createMessage('model', '', {
            id: modelMessageId,
            isLoading: true,
            generationStartTime: new Date()
        });
        
        let newTitle = undefined;
        if (!activeSessionId || (effectiveEditingId && messages.length === 0)) {
             // Set a temporary placeholder title based on content
             newTitle = generateSessionTitle([userMessage, modelMessage]);
        }

        updateAndPersistSessions(prev => performOptimisticSessionUpdate(prev, {
            activeSessionId,
            newSessionId: finalSessionId,
            newMessages: [userMessage, modelMessage],
            settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings },
            editingMessageId: effectiveEditingId,
            appSettings,
            title: newTitle,
            shouldLockKey: options.shouldLockKey,
            keyToLock: keyToUse
        }));

        if (!activeSessionId) {
            setActiveSessionId(finalSessionId);
        }

        setSessionLoading(finalSessionId, true);
        activeJobs.current.set(generationId, newAbortController);

        try {
            const { contentParts: promptParts } = await buildContentParts(text, imageFiles, currentChatSettings.modelId);
            const shouldStripThinking = currentChatSettings.hideThinkingInContext ?? appSettings.hideThinkingInContext;
            
            // Note: messages here is current messages *before* update.
            // If editing, we need to slice it for context.
            let historyMessages = messages;
            if (effectiveEditingId) {
                 const idx = messages.findIndex(m => m.id === effectiveEditingId);
                 if (idx !== -1) historyMessages = messages.slice(0, idx);
            }
            
            const historyForApi = await createChatHistoryForApi(historyMessages, shouldStripThinking);
            
            const callApi = () => geminiServiceInstance.editImage(keyToUse, currentChatSettings.modelId, historyForApi, promptParts, newAbortController.signal, aspectRatio, imageSize);

            const apiCalls = appSettings.generateQuadImages ? [callApi(), callApi(), callApi(), callApi()] : [callApi()];
            const results = await Promise.allSettled(apiCalls);

            if (newAbortController.signal.aborted) throw new Error("aborted");

            let combinedText = '';
            const combinedFiles: UploadedFile[] = [];
            let successfulImageCount = 0;

            results.forEach((result, index) => {
                const prefix = results.length > 1 ? `Image ${index + 1}: ` : '';

                if (result.status === 'fulfilled') {
                    const parts: Part[] = result.value;
                    let hasImagePart = false;
                    let textPartContent = '';
                    
                    parts.forEach(part => {
                        if (part.text) {
                            textPartContent += part.text;
                        } else if (part.inlineData) {
                            hasImagePart = true;
                            successfulImageCount++;
                            const { mimeType, data } = part.inlineData;
                            
                            const newFile = createUploadedFileFromBase64(data, mimeType, `edited-image-${index + 1}`);
                            combinedFiles.push(newFile);
                        }
                    });

                    if (textPartContent.trim()) {
                        combinedText += `${prefix}${textPartContent.trim()}\n\n`;
                    } else if (!hasImagePart && results.length > 1) {
                        combinedText += `${prefix}No image was generated for this request.\n\n`;
                    }

                } else {
                    logService.error(`Image edit API call failed for index ${index}`, { error: result.reason });
                    combinedText += `${prefix}Request failed. Error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}\n\n`;
                }
            });

            if (appSettings.generateQuadImages && successfulImageCount < 4 && successfulImageCount > 0) {
                const failureReason = combinedText.toLowerCase().includes("block") ? "Some images may have been blocked due to safety policies." : "Some image requests may have failed.";
                combinedText += `\n*[Note: Only ${successfulImageCount} of 4 images were generated successfully. ${failureReason}]*`;
            } else if (successfulImageCount === 0 && combinedText.trim() === '') {
                 combinedText = "[Error: Image generation failed with no specific message.]";
            }

            updateAndPersistSessions(p => p.map(s => s.id === finalSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: combinedText.trim(), files: combinedFiles, generationEndTime: new Date() } : m) } : s));

        } catch (error) {
            handleApiError(error, finalSessionId, modelMessageId, "Image Edit Error");
        } finally {
            setSessionLoading(finalSessionId, false);
            activeJobs.current.delete(generationId);
        }
    }, [updateAndPersistSessions, setSessionLoading, activeJobs, handleApiError, setActiveSessionId]);
    
    return { handleImageEditMessage };
};
