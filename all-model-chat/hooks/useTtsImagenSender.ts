import { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings } from '../types';
import { useApiErrorHandler } from './useApiErrorHandler';
import { geminiServiceInstance } from '../services/geminiService';
import { generateUniqueId, generateSessionTitle, pcmBase64ToWavUrl, showNotification, base64ToBlobUrl } from '../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../constants/appConstants';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface TtsImagenSenderProps {
    updateAndPersistSessions: SessionsUpdater;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setActiveSessionId: (id: string | null) => void;
}

export const useTtsImagenSender = ({
    updateAndPersistSessions,
    setLoadingSessionIds,
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
        options: { shouldLockKey?: boolean } = {}
    ) => {
        const isTtsModel = currentChatSettings.modelId.includes('-tts');
        const modelMessageId = generationId;
        
        let finalSessionId = activeSessionId;

        // Create user and model message placeholders
        const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: text, timestamp: new Date() };
        const modelMessage: ChatMessage = { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() };
        
        // Handle session creation or update in a single atomic operation
        if (!finalSessionId) { // New Chat
            const newSessionId = generateUniqueId();
            finalSessionId = newSessionId;
            let newSessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
            if (options.shouldLockKey) newSessionSettings.lockedApiKey = keyToUse;
            
            const newSession: SavedChatSession = {
                id: newSessionId,
                title: "New Chat",
                messages: [userMessage, modelMessage],
                timestamp: Date.now(),
                settings: newSessionSettings
            };
            updateAndPersistSessions(p => [newSession, ...p.filter(s => s.messages.length > 0)]);
            setActiveSessionId(newSessionId);
        } else { // Existing Chat
            updateAndPersistSessions(p => p.map(s => {
                if (s.id !== finalSessionId) return s;
                const newMessages = [...s.messages, userMessage, modelMessage];
                let newTitle = s.title;
                if (s.title === 'New Chat' && !appSettings.isAutoTitleEnabled) {
                    newTitle = generateSessionTitle(newMessages);
                }
                let updatedSettings = s.settings;
                if (options.shouldLockKey && !s.settings.lockedApiKey) {
                    updatedSettings = { ...s.settings, lockedApiKey: keyToUse };
                }
                return { ...s, messages: newMessages, title: newTitle, settings: updatedSettings };
            }));
        }

        if (!finalSessionId) {
            console.error("Error: Could not determine session ID for TTS/Imagen message.");
            return;
        }

        setLoadingSessionIds(prev => new Set(prev).add(finalSessionId!));
        activeJobs.current.set(generationId, newAbortController);

        try {
            if (isTtsModel) {
                const base64Pcm = await geminiServiceInstance.generateSpeech(keyToUse, currentChatSettings.modelId, text, currentChatSettings.ttsVoice, newAbortController.signal);
                if (newAbortController.signal.aborted) throw new Error("aborted");
                const wavUrl = pcmBase64ToWavUrl(base64Pcm);
                updateAndPersistSessions(p => p.map(s => s.id === finalSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: text, audioSrc: wavUrl, generationEndTime: new Date() } : m) } : s));
                
                if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                    showNotification('Audio Ready', { body: 'Text-to-speech audio has been generated.', icon: APP_LOGO_SVG_DATA_URI });
                }

            } else { // Imagen
                const imageBase64Array = appSettings.generateQuadImages
                    ? (await Promise.all([
                        geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, newAbortController.signal),
                        geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, newAbortController.signal),
                        geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, newAbortController.signal),
                        geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, newAbortController.signal),
                    ])).flat()
                    : await geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, newAbortController.signal);

                if (newAbortController.signal.aborted) throw new Error("aborted");
                const generatedFiles: UploadedFile[] = imageBase64Array.map((base64Data, index) => {
                    const dataUrl = base64ToBlobUrl(base64Data, 'image/jpeg');
                    return {
                        id: generateUniqueId(),
                        name: `generated-image-${index + 1}.jpeg`,
                        type: 'image/jpeg',
                        size: base64Data.length,
                        dataUrl: dataUrl,
                        uploadState: 'active'
                    };
                });
                updateAndPersistSessions(p => p.map(s => s.id === finalSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: `Generated ${generatedFiles.length} image(s) for: "${text}"`, files: generatedFiles, generationEndTime: new Date() } : m) } : s));

                if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                    showNotification('Image Ready', { body: 'Your image has been generated.', icon: APP_LOGO_SVG_DATA_URI });
                }
            }
        } catch (error) {
            handleApiError(error, finalSessionId, modelMessageId, isTtsModel ? "TTS Error" : "Image Gen Error");
        } finally {
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(finalSessionId!); return next; });
            activeJobs.current.delete(generationId);
        }
    }, [updateAndPersistSessions, setLoadingSessionIds, activeJobs, handleApiError, setActiveSessionId]);
    
    return { handleTtsImagenMessage };
};