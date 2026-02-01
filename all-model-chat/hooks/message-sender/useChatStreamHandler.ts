import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatMessage, ChatSettings as IndividualChatSettings } from '../../types';
import { Part, UsageMetadata } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { logService, showNotification, calculateTokenStats } from '../../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../../constants/appConstants';
import { updateMessagesWithPart, updateMessagesWithThought, finalizeMessages } from '../chat-stream/processors';
import { useMultiTabSync } from '../core/useMultiTabSync';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;

interface ChatStreamHandlerProps {
    appSettings: AppSettings;
    updateAndPersistSessions: SessionsUpdater;
    setSessionLoading: (sessionId: string, isLoading: boolean) => void;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    broadcast?: (message: any) => void; // New optional prop for broadcasting
}

export const useChatStreamHandler = ({
    appSettings,
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
    broadcast
}: ChatStreamHandlerProps) => {
    const { handleApiError } = useApiErrorHandler(updateAndPersistSessions);

    const getStreamHandlers = useCallback((
        currentSessionId: string,
        generationId: string,
        abortController: AbortController,
        generationStartTime: Date,
        currentChatSettings: IndividualChatSettings,
        onSuccess?: (generationId: string, finalContent: string) => void
    ) => {
        const newModelMessageIds = new Set<string>([generationId]);
        let firstContentPartTime: Date | null = null;
        let accumulatedText = "";

        const streamOnError = (error: Error) => {
            handleApiError(error, currentSessionId, generationId);
            setSessionLoading(currentSessionId, false);
            activeJobs.current.delete(generationId);
        };

        const streamOnComplete = (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => {
            const lang = appSettings.language === 'system' 
                ? (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en')
                : appSettings.language;

            if (appSettings.isStreamingEnabled && !firstContentPartTime) {
                firstContentPartTime = new Date();
            }

            if (usageMetadata) {
                const { promptTokens, completionTokens } = calculateTokenStats(usageMetadata);
                logService.recordTokenUsage(
                    currentChatSettings.modelId,
                    promptTokens,
                    completionTokens
                );
            }

            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;

                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                
                const { updatedMessages, completedMessageForNotification } = finalizeMessages(
                    sessionToUpdate.messages,
                    generationStartTime,
                    newModelMessageIds,
                    currentChatSettings,
                    lang,
                    firstContentPartTime,
                    usageMetadata,
                    groundingMetadata,
                    urlContextMetadata,
                    abortController.signal.aborted
                );

                sessionToUpdate.messages = updatedMessages;
                newSessions[sessionIndex] = sessionToUpdate;

                if (completedMessageForNotification) {
                    if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                        const notificationBody = (completedMessageForNotification.content || "Media or tool response received").substring(0, 150) + (completedMessageForNotification.content && completedMessageForNotification.content.length > 150 ? '...' : '');
                        showNotification(
                            'Response Ready', 
                            {
                                body: notificationBody,
                                icon: APP_LOGO_SVG_DATA_URI,
                            }
                        );
                    }
                }

                return newSessions;
            }, { persist: true });

            setSessionLoading(currentSessionId, false);
            activeJobs.current.delete(generationId);

            if (onSuccess && !abortController.signal.aborted) {
                setTimeout(() => onSuccess(generationId, accumulatedText), 0);
            }
        };

        const streamOnPart = (part: Part) => {
            const anyPart = part as any;
            
            if (anyPart.text) {
                accumulatedText += anyPart.text;
            }

            const hasMeaningfulContent = 
                (anyPart.text && anyPart.text.trim().length > 0) || 
                anyPart.executableCode || 
                anyPart.codeExecutionResult || 
                anyPart.inlineData;

            if (appSettings.isStreamingEnabled && !firstContentPartTime && hasMeaningfulContent) {
                firstContentPartTime = new Date();
            }
            
            // Real-time broadcast for multi-tab sync
            if (broadcast) {
                broadcast({ 
                    type: 'STREAM_PART_RECEIVED', 
                    sessionId: currentSessionId, 
                    part, 
                    generationStartTime: generationStartTime.getTime() 
                });
            }
        
            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;
        
                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                
                const updatedMessages = updateMessagesWithPart(
                    sessionToUpdate.messages,
                    part,
                    generationStartTime,
                    newModelMessageIds,
                    firstContentPartTime
                );
                
                sessionToUpdate.messages = updatedMessages;
                newSessions[sessionIndex] = sessionToUpdate;
                
                return newSessions;
            }, { persist: false });
        };
        
        const onThoughtChunk = (thoughtChunk: string) => {
            // Real-time broadcast for multi-tab sync
            if (broadcast) {
                broadcast({ 
                    type: 'STREAM_THOUGHT_RECEIVED', 
                    sessionId: currentSessionId, 
                    thoughtChunk, 
                    generationStartTime: generationStartTime.getTime() 
                });
            }

            updateAndPersistSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
                if (sessionIndex === -1) return prev;
        
                const newSessions = [...prev];
                const sessionToUpdate = { ...newSessions[sessionIndex] };
                
                const updatedMessages = updateMessagesWithThought(
                    sessionToUpdate.messages,
                    thoughtChunk,
                    generationStartTime
                );

                sessionToUpdate.messages = updatedMessages;
                newSessions[sessionIndex] = sessionToUpdate;
                
                return newSessions;
            }, { persist: false });
        };
        
        return { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk };

    }, [appSettings.isStreamingEnabled, appSettings.isCompletionNotificationEnabled, appSettings.language, updateAndPersistSessions, handleApiError, setSessionLoading, activeJobs, broadcast]);
    
    return { getStreamHandlers };
};