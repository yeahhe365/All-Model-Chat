
import { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings } from '../types';
import { useApiErrorHandler } from './useApiErrorHandler';
import { geminiServiceInstance } from '../services/geminiService';
import { generateUniqueId, buildContentParts, base64ToBlob, createChatHistoryForApi, logService, createNewSession } from '../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { Part } from '@google/genai';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface ImageEditSenderProps {
    updateAndPersistSessions: SessionsUpdater;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setActiveSessionId: (id: string | null) => void;
}

export const useImageEditSender = ({
    updateAndPersistSessions,
    setLoadingSessionIds,
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

        let finalSessionId = activeSessionId;
        const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: text, files, timestamp: new Date() };
        const modelMessage: ChatMessage = { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() };
        
        if (!finalSessionId) { // New Chat
            let newSessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
            if (options.shouldLockKey) newSessionSettings.lockedApiKey = keyToUse;
            
            const newSession = createNewSession(newSessionSettings, [userMessage, modelMessage], "New Image Edit");
            finalSessionId = newSession.id;
            
            updateAndPersistSessions(p => [newSession, ...p.filter(s => s.messages.length > 0)]);
            setActiveSessionId(newSession.id);
        } else { // Existing Chat or Edit
            updateAndPersistSessions(p => p.map(s => {
                const isSessionToUpdate = effectiveEditingId ? s.messages.some(m => m.id === effectiveEditingId) : s.id === finalSessionId;
                if (!isSessionToUpdate) return s;

                const editIndex = effectiveEditingId ? s.messages.findIndex(m => m.id === effectiveEditingId) : -1;
                const baseMessages = editIndex !== -1 ? s.messages.slice(0, editIndex) : s.messages;
                
                const newMessages = [...baseMessages, userMessage, modelMessage];
                
                let newTitle = s.title;
                if (s.title === 'New Chat' || (editIndex !== -1 && s.messages.length < 3)) {
                     newTitle = text.substring(0, 30).trim() || "Image Edit";
                }
                let updatedSettings = s.settings;
                if (options.shouldLockKey && !s.settings.lockedApiKey) {
                    updatedSettings = { ...s.settings, lockedApiKey: keyToUse };
                }
                return { ...s, messages: newMessages, title: newTitle, settings: updatedSettings };
            }));
        }

        if (!finalSessionId) {
            console.error("Error: Could not determine session ID for Image Edit message.");
            return;
        }

        setLoadingSessionIds(prev => new Set(prev).add(finalSessionId!));
        activeJobs.current.set(generationId, newAbortController);

        try {
            // For image edit, we typically don't apply custom resolution logic yet as it's a specific endpoint/task,
            // but we can pass the modelId anyway.
            const { contentParts: promptParts } = await buildContentParts(text, imageFiles, currentChatSettings.modelId);
            const historyForApi = await createChatHistoryForApi(messages);
            
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
                            const name = `edited-image-${index + 1}.png`;
                            const blob = base64ToBlob(data, mimeType);
                            const file = new File([blob], name, { type: mimeType });
                            const dataUrl = URL.createObjectURL(file);
                            combinedFiles.push({
                                id: generateUniqueId(),
                                name,
                                type: mimeType,
                                size: file.size,
                                dataUrl,
                                rawFile: file,
                                uploadState: 'active',
                            });
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
            handleApiError(error, finalSessionId!, modelMessageId, "Image Edit Error");
        } finally {
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(finalSessionId!); return next; });
            activeJobs.current.delete(generationId);
        }
    }, [updateAndPersistSessions, setLoadingSessionIds, activeJobs, handleApiError, setActiveSessionId]);
    
    return { handleImageEditMessage };
};