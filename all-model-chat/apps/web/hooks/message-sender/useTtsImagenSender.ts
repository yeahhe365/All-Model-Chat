


import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatSettings as IndividualChatSettings } from '../../types';
import { useApiErrorHandler } from './useApiErrorHandler';
import { geminiServiceInstance } from '../../services/geminiService';
import { generateUniqueId, pcmBase64ToWavUrl, showNotification, performOptimisticSessionUpdate, createMessage, createUploadedFileFromBase64, generateSessionTitle, playCompletionSound } from '../../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../../constants/appConstants';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface TtsImagenSenderProps {
    updateAndPersistSessions: SessionsUpdater;
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setActiveSessionId: (id: string | null) => void;
}

export const useTtsImagenSender = ({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
    setActiveSessionId,
}: TtsImagenSenderProps) => {
    const { handleApiError } = useApiErrorHandler(updateAndPersistSessions);
    
    const handleTtsImagenMessage = useCallback(async (
        keyToUse: string,
        activeSessionId: string | null,
        generationId: string,
        newAbortController: AbortController,
        appSettings: AppSettings,
        currentChatSettings: IndividualChatSettings,
        text: string,
        aspectRatio: string,
        imageSize: string | undefined,
        options: { shouldLockKey?: boolean } = {}
    ) => {
        const isTtsModel = currentChatSettings.modelId.includes('-tts');
        const modelMessageId = generationId;
        
        const finalSessionId = activeSessionId || generateUniqueId();
        
        const userMessage = createMessage('user', text);
        const modelMessage = createMessage('model', '', {
            id: modelMessageId,
            isLoading: true,
            generationStartTime: new Date()
        });
        
        // Auto Title if needed (Simple heuristic for these models)
        let newTitle = undefined;
        if (!activeSessionId) {
             // Set a temporary placeholder title based on content
             newTitle = generateSessionTitle([userMessage, modelMessage]);
        }

        updateAndPersistSessions(prev => performOptimisticSessionUpdate(prev, {
            activeSessionId,
            newSessionId: finalSessionId,
            newMessages: [userMessage, modelMessage],
            settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings },
            // Editing is less relevant for TTS/Imagen one-offs, but we support it structure-wise
            editingMessageId: null, 
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
            if (isTtsModel) {
                const base64Pcm = await geminiServiceInstance.generateSpeech(keyToUse, currentChatSettings.modelId, text, currentChatSettings.ttsVoice, newAbortController.signal);
                if (newAbortController.signal.aborted) throw new Error("aborted");
                const wavUrl = pcmBase64ToWavUrl(base64Pcm);
                
                updateAndPersistSessions(p => p.map(s => s.id === finalSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: text, audioSrc: wavUrl, audioAutoplay: true, generationEndTime: new Date() } : m) } : s));
                
                if (appSettings.isCompletionSoundEnabled) {
                    playCompletionSound();
                }

                if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                    showNotification('Audio Ready', { body: 'Text-to-speech audio has been generated.', icon: APP_LOGO_SVG_DATA_URI });
                }

            } else { // Imagen
                const imageBase64Array = appSettings.generateQuadImages
                    ? (await Promise.all([
                        geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, imageSize, newAbortController.signal),
                        geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, imageSize, newAbortController.signal),
                        geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, imageSize, newAbortController.signal),
                        geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, imageSize, newAbortController.signal),
                    ])).flat()
                    : await geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, imageSize, newAbortController.signal);

                if (newAbortController.signal.aborted) throw new Error("aborted");
                
                const generatedFiles = imageBase64Array.map((base64Data, index) => {
                    return createUploadedFileFromBase64(base64Data, 'image/png', `generated-image-${index + 1}`);
                });

                updateAndPersistSessions(p => p.map(s => s.id === finalSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: `Generated ${generatedFiles.length} image(s) for: "${text}"`, files: generatedFiles, generationEndTime: new Date() } : m) } : s));

                if (appSettings.isCompletionSoundEnabled) {
                    playCompletionSound();
                }

                if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                    showNotification('Image Ready', { body: 'Your image has been generated.', icon: APP_LOGO_SVG_DATA_URI });
                }
            }
        } catch (error) {
            handleApiError(error, finalSessionId, modelMessageId, isTtsModel ? "TTS Error" : "Image Gen Error");
        } finally {
            setSessionLoading(finalSessionId, false);
            activeJobs.current.delete(generationId);
        }
    }, [updateAndPersistSessions, setSessionLoading, activeJobs, handleApiError, setActiveSessionId]);
    
    return { handleTtsImagenMessage };
};
