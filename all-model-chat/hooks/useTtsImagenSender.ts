// hooks/useTtsImagenSender.ts
import { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, UploadedFile, ChatSettings as IndividualChatSettings } from '../types';
import { useApiErrorHandler } from './useApiErrorHandler';
import { geminiServiceInstance } from '../services/geminiService';
import { generateUniqueId, generateSessionTitle, pcmBase64ToWavUrl, showNotification } from '../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../constants/appConstants';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface TtsImagenSenderProps {
    updateAndPersistSessions: SessionsUpdater;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
}

export const useTtsImagenSender = ({
    updateAndPersistSessions,
    setLoadingSessionIds,
    activeJobs
}: TtsImagenSenderProps) => {
    const { handleApiError } = useApiErrorHandler(updateAndPersistSessions);
    
    const handleTtsImagenMessage = useCallback(async (
        keyToUse: string,
        currentSessionId: string,
        generationId: string,
        newAbortController: AbortController,
        appSettings: AppSettings,
        currentChatSettings: IndividualChatSettings,
        text: string,
        aspectRatio: string
    ) => {
        const isTtsModel = currentChatSettings.modelId.includes('-tts');
        const userMessage: ChatMessage = { id: generateUniqueId(), role: 'user', content: text, timestamp: new Date() };
        const modelMessageId = generationId;
        const modelMessage: ChatMessage = { id: modelMessageId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: new Date() };
        
        updateAndPersistSessions(prev => prev.map(s => {
            if (s.id !== currentSessionId) return s;
            const newMessages = [...s.messages, userMessage, modelMessage];
            return { ...s, messages: newMessages, title: generateSessionTitle(newMessages) };
        }));

        try {
            if (isTtsModel) {
                const base64Pcm = await geminiServiceInstance.generateSpeech(keyToUse, currentChatSettings.modelId, text, currentChatSettings.ttsVoice, newAbortController.signal);
                if (newAbortController.signal.aborted) throw new Error("aborted");
                const wavUrl = pcmBase64ToWavUrl(base64Pcm);
                updateAndPersistSessions(p => p.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: text, audioSrc: wavUrl, generationEndTime: new Date() } : m) } : s));
                
                if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                    showNotification('Audio Ready', { body: 'Text-to-speech audio has been generated.', icon: APP_LOGO_SVG_DATA_URI });
                }

            } else { // Imagen
                const imageBase64Array = await geminiServiceInstance.generateImages(keyToUse, currentChatSettings.modelId, text, aspectRatio, newAbortController.signal);
                if (newAbortController.signal.aborted) throw new Error("aborted");
                const generatedFiles: UploadedFile[] = imageBase64Array.map((base64Data, index) => ({ id: generateUniqueId(), name: `generated-image-${index + 1}.jpeg`, type: 'image/jpeg', size: base64Data.length, dataUrl: `data:image/jpeg;base64,${base64Data}`, base64Data, uploadState: 'active' }));
                updateAndPersistSessions(p => p.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.map(m => m.id === modelMessageId ? { ...m, isLoading: false, content: `Generated image for: "${text}"`, files: generatedFiles, generationEndTime: new Date() } : m) } : s));

                if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                    showNotification('Image Ready', { body: 'Your image has been generated.', icon: APP_LOGO_SVG_DATA_URI });
                }
            }
        } catch (error) {
            handleApiError(error, currentSessionId, modelMessageId, isTtsModel ? "TTS Error" : "Image Gen Error");
        } finally {
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(currentSessionId); return next; });
            activeJobs.current.delete(generationId);
        }
    }, [updateAndPersistSessions, setLoadingSessionIds, activeJobs, handleApiError]);
    
    return { handleTtsImagenMessage };
};